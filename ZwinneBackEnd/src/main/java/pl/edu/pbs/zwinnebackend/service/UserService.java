package pl.edu.pbs.zwinnebackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.edu.pbs.zwinnebackend.dto.RegisterRequest;
import pl.edu.pbs.zwinnebackend.model.Rola;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UzytkownikRepository uzytkownikRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.security.lecturer-key}")
    private String lecturerKey;

    @Transactional
    public Uzytkownik registerUser(RegisterRequest registerRequest) {
        if (uzytkownikRepository.existsByEmail(registerRequest.getEmail())) {
            throw new IllegalArgumentException("Użytkownik o podanym adresie e-mail już istnieje.");
        }

        Rola rola = Rola.ROLE_STUDENT;
        
        // Sprawdzamy czy podano klucz rejestracji prowadzącego
        if (registerRequest.getLecturerKey() != null && !registerRequest.getLecturerKey().trim().isEmpty()) {
            if (this.lecturerKey.equals(registerRequest.getLecturerKey())) {
                rola = Rola.ROLE_PROWADZACY;
            } else {
                throw new IllegalArgumentException("Niepoprawny klucz rejestracji prowadzącego.");
            }
        }

        Uzytkownik uzytkownik = Uzytkownik.builder()
                .email(registerRequest.getEmail())
                .passwordHash(passwordEncoder.encode(registerRequest.getPassword()))
                .imie(registerRequest.getFirstName())
                .nazwisko(registerRequest.getLastName())
                .nrIndeksu(rola == Rola.ROLE_STUDENT ? registerRequest.getIndexNumber() : null)
                .formaStudiow(rola == Rola.ROLE_STUDENT ? registerRequest.getStudyMode() : null)
                .rola(rola)
                .build();

        return uzytkownikRepository.save(uzytkownik);
    }

    public List<Uzytkownik> getAllStudents() {
        return uzytkownikRepository.findByRola(Rola.ROLE_STUDENT);
    }
}
