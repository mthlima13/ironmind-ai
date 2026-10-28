package com.ironmind.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

class IdentityHeaderFilterTest {

    private static final String HEADER = "X-User-UUID";
    private static final UUID USER_ID = UUID.fromString("11111111-2222-3333-4444-555555555555");

    private final IdentityHeaderFilter filter = new IdentityHeaderFilter(new IdentityProperties(HEADER));

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesTheOwnerFromTheHeader() throws Exception {
        Authentication authentication = run(HEADER, USER_ID.toString());

        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(new AuthenticatedUser(USER_ID));
    }

    @Test
    void normalizesAnUpperCaseUuid() throws Exception {
        Authentication authentication = run(HEADER, USER_ID.toString().toUpperCase());

        assertThat(authentication).isNotNull();
        assertThat(((AuthenticatedUser) authentication.getPrincipal()).userId()).isEqualTo(USER_ID);
    }

    @Test
    void acceptsSurroundingSpaces() throws Exception {
        Authentication authentication = run(HEADER, "  " + USER_ID + "  ");

        assertThat(authentication).isNotNull();
    }

    @Test
    void keepsTheRequestAnonymousWithoutTheHeader() throws Exception {
        assertThat(run(HEADER, null)).isNull();
    }

    @Test
    void keepsTheRequestAnonymousWithAnEmptyHeader() throws Exception {
        assertThat(run(HEADER, "   ")).isNull();
    }

    @Test
    void keepsTheRequestAnonymousWithDuplicatedHeaders() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HEADER, USER_ID.toString());
        request.addHeader(HEADER, UUID.randomUUID().toString());

        assertThat(execute(request)).isNull();
    }

    @Test
    void keepsTheRequestAnonymousWithConcatenatedValues() throws Exception {
        assertThat(run(HEADER, USER_ID + ", " + UUID.randomUUID())).isNull();
    }

    @Test
    void keepsTheRequestAnonymousWithANonCanonicalUuid() throws Exception {
        assertThat(run(HEADER, "1-1-1-1-1")).isNull();
        assertThat(execute(newRequest(HEADER, "{" + USER_ID + "}"))).isNull();
        assertThat(execute(newRequest(HEADER, "urn:uuid:" + USER_ID))).isNull();
        assertThat(execute(newRequest(HEADER, USER_ID.toString().replace("-", "")))).isNull();
    }

    @Test
    void keepsTheRequestAnonymousWithTheNilUuid() throws Exception {
        assertThat(run(HEADER, "00000000-0000-0000-0000-000000000000")).isNull();
    }

    @Test
    void ignoresTheHeaderWhenItHasAnotherName() throws Exception {
        assertThat(run("X-User-Id", USER_ID.toString())).isNull();
    }

    private Authentication run(String headerName, String headerValue) throws Exception {
        return execute(newRequest(headerName, headerValue));
    }

    private Authentication execute(MockHttpServletRequest request) throws Exception {
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private static MockHttpServletRequest newRequest(String headerName, String headerValue) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (headerValue != null) {
            request.addHeader(headerName, headerValue);
        }
        return request;
    }
}
