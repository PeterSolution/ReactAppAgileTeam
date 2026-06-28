package pl.edu.pbs.zwinnebackend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "uzytkownik", uniqueConstraints = {
    @UniqueConstraint(columnNames = "email")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Uzytkownik {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    @NotBlank
    @Column(nullable = false)
    private String imie;

    @NotBlank
    @Column(nullable = false)
    private String nazwisko;

    // Numer indeksu - opcjonalny dla prowadzącego, wymagany dla studenta
    private String nrIndeksu;

    // Forma studiów - opcjonalna dla prowadzącego, wymagana dla studenta (np. stacjonarne/niestacjonarne)
    private String formaStudiow;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rola rola;
}
