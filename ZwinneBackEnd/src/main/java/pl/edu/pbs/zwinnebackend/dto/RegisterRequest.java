package pl.edu.pbs.zwinnebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, message = "Hasło musi mieć co najmniej 6 znaków")
    private String password;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    private String indexNumber;

    private String studyMode;

    private String lecturerKey; // Opcjonalny klucz do rejestracji jako prowadzący
}
