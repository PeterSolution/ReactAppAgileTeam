package pl.edu.pbs.zwinnebackend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "komentarz_zadania")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Komentarz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zadanie_id", nullable = false)
    private Zadanie zadanie;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "autor_id", nullable = false)
    private Uzytkownik autor;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String tresc;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataUtworzenia;

    @PrePersist
    protected void onCreate() {
        dataUtworzenia = LocalDateTime.now();
    }
}
