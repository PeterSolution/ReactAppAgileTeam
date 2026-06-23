package pl.edu.pbs.zwinnebackend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "wiadomosc_chat")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WiadomoscChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = true)
    @JoinColumn(name = "nadawca_id", nullable = true)
    private Uzytkownik nadawca;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projekt_id") // null oznacza czat ogólnodostępny
    private Projekt projekt;

    @NotBlank
    @Column(nullable = false, length = 1000)
    private String tresc;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataWyslania;

    @PrePersist
    protected void onCreate() {
        dataWyslania = LocalDateTime.now();
    }
}
