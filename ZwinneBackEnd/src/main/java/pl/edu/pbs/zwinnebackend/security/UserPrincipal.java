package pl.edu.pbs.zwinnebackend.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;

import java.util.Collection;
import java.util.Collections;
import java.util.Objects;

public class UserPrincipal implements UserDetails {
    private final Long id;
    private final String email;
    @JsonIgnore
    private final String password;
    private final Collection<? extends GrantedAuthority> authorities;
    private final Uzytkownik uzytkownik;

    public UserPrincipal(Long id, String email, String password, Collection<? extends GrantedAuthority> authorities, Uzytkownik uzytkownik) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.authorities = authorities;
        this.uzytkownik = uzytkownik;
    }

    public static UserPrincipal create(Uzytkownik uzytkownik) {
        Collection<GrantedAuthority> authorities = Collections.singletonList(
            new SimpleGrantedAuthority(uzytkownik.getRola().name())
        );

        return new UserPrincipal(
            uzytkownik.getId(),
            uzytkownik.getEmail(),
            uzytkownik.getPasswordHash(),
            authorities,
            uzytkownik
        );
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public Uzytkownik getUzytkownik() {
        return uzytkownik;
    }

    @Override
    public String getUsername() {
        return email; // Logujemy się za pomocą e-maila
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserPrincipal that = (UserPrincipal) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
