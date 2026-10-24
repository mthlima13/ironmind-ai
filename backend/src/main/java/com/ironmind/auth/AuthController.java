package com.ironmind.auth;

import com.ironmind.auth.dto.AuthResponse;
import com.ironmind.auth.dto.ForgotPasswordRequest;
import com.ironmind.auth.dto.LoginRequest;
import com.ironmind.auth.dto.LogoutRequest;
import com.ironmind.auth.dto.MessageResponse;
import com.ironmind.auth.dto.RefreshRequest;
import com.ironmind.auth.dto.RegisterRequest;
import com.ironmind.auth.dto.ResetPasswordRequest;
import com.ironmind.auth.ratelimit.AuthRateLimiter;
import com.ironmind.auth.ratelimit.RateLimitScope;
import com.ironmind.auth.service.AuthService;
import com.ironmind.common.security.SecurityUtils;
import com.ironmind.common.web.ClientIpResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of the authentication (SPEC.md section 11.1).
 *
 * <p>The controller only translates the HTTP into the calls of the service: the rules of the
 * flow live in {@link AuthService}. The rate limit is applied here because it is a concern of
 * the transport, not of the domain.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Cadastro, login, renovação de token e recuperação de acesso")
public class AuthController {

    /**
     * Answer of the password recovery request, the same for every e-mail.
     */
    private static final String RECOVERY_ANSWER =
            "Se o e-mail estiver cadastrado, enviamos as instruções de recuperação de acesso.";

    private final AuthService authService;
    private final AuthRateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;

    public AuthController(AuthService authService, AuthRateLimiter rateLimiter, ClientIpResolver clientIpResolver) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping("/register")
    @Operation(summary = "Cria uma conta",
            description = "Cria a conta, as preferências padrão e a primeira família de refresh tokens na mesma "
                    + "transação. Aceita o header Idempotency-Key: a repetição devolve a mesma conta com HTTP 200.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Conta criada"),
            @ApiResponse(responseCode = "200", description = "Conta criada por uma requisição anterior com a mesma chave"),
            @ApiResponse(responseCode = "409", description = "E-mail já cadastrado", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de requisições excedido", content = @Content)
    })
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            @Parameter(in = ParameterIn.HEADER, name = "Idempotency-Key",
                    description = "Chave de idempotência da operação.")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            HttpServletRequest httpRequest) {
        rateLimiter.check(RateLimitScope.REGISTER, clientIpResolver.resolve(httpRequest), request.email());
        AuthService.RegistrationResult result = authService.register(request, idempotencyKey);
        if (!result.created()) {
            return ResponseEntity.ok(result.response());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(result.response());
    }

    @PostMapping("/login")
    @Operation(summary = "Autentica o usuário",
            description = "Devolve os tokens da sessão. Um e-mail inexistente e uma senha errada devolvem a mesma "
                    + "resposta, para não revelar quais e-mails estão cadastrados.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tokens emitidos"),
            @ApiResponse(responseCode = "401", description = "E-mail ou senha inválidos", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de requisições excedido", content = @Content)
    })
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        rateLimiter.check(RateLimitScope.LOGIN, clientIpResolver.resolve(httpRequest), request.email());
        return authService.login(request);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renova a sessão",
            description = "Revoga o refresh token apresentado e emite um novo token da mesma família. "
                    + "Apresentar um token já revogado revoga a família inteira.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tokens emitidos"),
            @ApiResponse(responseCode = "401", description = "Token inválido, expirado ou já revogado", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de requisições excedido", content = @Content)
    })
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        rateLimiter.check(RateLimitScope.REFRESH, clientIpResolver.resolve(httpRequest), null);
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    @Operation(summary = "Encerra a sessão",
            description = "Revoga o refresh token apresentado. A operação é idempotente.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Sessão encerrada"),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        UUID ownerId = SecurityUtils.currentUserId().orElse(null);
        authService.logout(request, ownerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Inicia a recuperação de acesso",
            description = "Responde sempre com HTTP 202 e a mesma mensagem, exista ou não a conta.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Pedido recebido"),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de requisições excedido", content = @Content)
    })
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        rateLimiter.check(RateLimitScope.FORGOT_PASSWORD, clientIpResolver.resolve(httpRequest), request.email());
        authService.requestPasswordReset(request.email());
        return ResponseEntity.accepted().body(new MessageResponse(RECOVERY_ANSWER));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Conclui a recuperação de acesso",
            description = "Consome o token de uso único, troca a senha e revoga todos os refresh tokens do usuário.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Senha trocada"),
            @ApiResponse(responseCode = "401", description = "Token inválido, expirado ou já usado", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de requisições excedido", content = @Content)
    })
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        rateLimiter.check(RateLimitScope.RESET_PASSWORD, clientIpResolver.resolve(httpRequest), request.token());
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }
}
