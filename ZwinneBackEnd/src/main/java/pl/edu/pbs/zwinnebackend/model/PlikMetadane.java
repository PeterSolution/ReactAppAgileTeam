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
@Table(name = "plik_metadane")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlikMetadane {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projekt_id")
    private Projekt projekt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zadanie_id")
    private Zadanie zadanie;

    @NotBlank
    @Column(nullable = false)
    private String nazwaPliku;

    @NotBlank
    @Column(nullable = false)
    private String sciezkaPliku;

    private String typPliku;

    private Long rozmiar;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataPrzeslania;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "przeslany_przez_id")
    private Uzytkownik przeslanyPrzez;

    @PrePersist
    protected void onCreate() {
        dataPrzeslania = LocalDateTime.now();
    }
}
