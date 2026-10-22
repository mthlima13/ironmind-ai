package com.ironmind.user;

import com.ironmind.common.security.SecurityUtils;
import com.ironmind.user.dto.UpdateProfileRequest;
import com.ironmind.user.dto.UserProfileResponse;
import com.ironmind.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of the profile and of the preferences of the authenticated user
 * (SPEC.md section 11.1).
 *
 * <p>The owner always comes from the access token: the body of the request never identifies the
 * user.
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Perfil e preferências do usuário autenticado")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @Operation(summary = "Consulta o perfil e as preferências",
            description = "Devolve o perfil aninhado do usuário do token, com as preferências normalizadas.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Perfil do usuário autenticado"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content)
    })
    public UserProfileResponse getProfile() {
        return userService.getProfile(SecurityUtils.requireCurrentUserId());
    }

    @PatchMapping("/me")
    @Operation(summary = "Atualiza o perfil e as preferências",
            description = "Atualização parcial e mesclada: o campo omitido mantém o valor atual. "
                    + "O e-mail e o papel não são alteráveis por este endpoint.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Perfil atualizado"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public UserProfileResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(SecurityUtils.requireCurrentUserId(), request);
    }
}
