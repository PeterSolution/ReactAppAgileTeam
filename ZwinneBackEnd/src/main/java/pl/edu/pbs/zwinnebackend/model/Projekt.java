package pl.edu.pbs.zwinnebackend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "projekt")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Projekt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String nazwa;

    @Column(columnDefinition = "TEXT")
    private String opis;

    @Column(nullable = false, updatable = false)
    private LocalDateTime utworzony;

    @Column(nullable = false)
    private LocalDateTime zmodyfikowany;

    @NotNull
    @Column(nullable = false)
    private LocalDate dataOddania;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "projekt_student",
        joinColumns = @JoinColumn(name = "projekt_id"),
        inverseJoinColumns = @JoinColumn(name = "student_id")
    )
    @Builder.Default
    private Set<Uzytkownik> studenci = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        utworzony = LocalDateTime.now();
        zmodyfikowany = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        zmodyfikowany = LocalDateTime.now();
    }
}
