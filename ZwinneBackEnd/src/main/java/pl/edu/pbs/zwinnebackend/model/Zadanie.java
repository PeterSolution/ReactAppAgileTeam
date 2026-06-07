package pl.edu.pbs.zwinnebackend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "zadanie")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Zadanie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "projekt_id", nullable = false)
    private Projekt projekt;

    @NotBlank
    @Column(nullable = false)
    private String nazwa;

    @Column(columnDefinition = "TEXT")
    private String opis;

    private Integer kolejnosc;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusZadania status = StatusZadania.TODO;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataUtworzenia;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "przypisany_student_id")
    private Uzytkownik przypisanyStudent;

    @PrePersist
    protected void onCreate() {
        dataUtworzenia = LocalDateTime.now();
    }
}
