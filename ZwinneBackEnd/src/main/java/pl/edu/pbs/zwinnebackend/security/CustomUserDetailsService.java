package pl.edu.pbs.zwinnebackend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UzytkownikRepository uzytkownikRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Uzytkownik uzytkownik = uzytkownikRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Nie znaleziono użytkownika o e-mailu: " + email));
        return UserPrincipal.create(uzytkownik);
    }

    @Transactional
    public UserDetails loadUserById(Long id) {
        Uzytkownik uzytkownik = uzytkownikRepository.findById(id)
            .orElseThrow(() -> new UsernameNotFoundException("Nie znaleziono użytkownika o id: " + id));
        return UserPrincipal.create(uzytkownik);
    }
}
