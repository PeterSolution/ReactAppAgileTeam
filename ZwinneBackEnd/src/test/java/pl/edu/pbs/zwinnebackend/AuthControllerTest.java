package pl.edu.pbs.zwinnebackend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pl.edu.pbs.zwinnebackend.dto.LoginRequest;
import pl.edu.pbs.zwinnebackend.dto.RegisterRequest;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UzytkownikRepository uzytkownikRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setup() {
        uzytkownikRepository.deleteAll();
    }

    @Test
    public void registerStudent_Success() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("student@test.pl");
        request.setPassword("password123");
        request.setFirstName("Jan");
        request.setLastName("Kowalski");
        request.setIndexNumber("123456");
        request.setStudyMode("stacjonarne");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Zarejestrowano pomyślnie."));
    }

    @Test
    public void registerLecturer_WithCorrectKey_Success() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("wykladowca@test.pl");
        request.setPassword("password123");
        request.setFirstName("Adam");
        request.setLastName("Nowak");
        request.setLecturerKey("SecretLecturer123"); // Klucz skonfigurowany w properties

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void registerLecturer_WithIncorrectKey_Fail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("wykladowca@test.pl");
        request.setPassword("password123");
        request.setFirstName("Adam");
        request.setLastName("Nowak");
        request.setLecturerKey("WrongKey");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Niepoprawny klucz rejestracji prowadzącego."));
    }

    @Test
    public void login_Success() throws Exception {
        // Rejestracja studenta przed testem logowania
        RegisterRequest regRequest = new RegisterRequest();
        regRequest.setEmail("login@test.pl");
        regRequest.setPassword("password123");
        regRequest.setFirstName("Jan");
        regRequest.setLastName("Kowalski");
        regRequest.setIndexNumber("111111");
        regRequest.setStudyMode("stacjonarne");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regRequest)))
                .andExpect(status().isOk());

        // Logowanie
        LoginRequest logRequest = new LoginRequest();
        logRequest.setEmail("login@test.pl");
        logRequest.setPassword("password123");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andExpect(jsonPath("$.rola").value("ROLE_STUDENT"))
                .andExpect(jsonPath("$.email").value("login@test.pl"));
    }

    @Test
    public void login_IncorrectCredentials_Fail() throws Exception {
        LoginRequest logRequest = new LoginRequest();
        logRequest.setEmail("notfound@test.pl");
        logRequest.setPassword("wrongpass");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Niepoprawny e-mail lub hasło."));
    }

    @Test
    public void login_DoubleLogin_Success() throws Exception {
        RegisterRequest regRequest = new RegisterRequest();
        regRequest.setEmail("double_login@test.pl");
        regRequest.setPassword("password123");
        regRequest.setFirstName("Jan");
        regRequest.setLastName("Kowalski");
        regRequest.setIndexNumber("111111");
        regRequest.setStudyMode("stacjonarne");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regRequest)))
                .andExpect(status().isOk());

        LoginRequest logRequest = new LoginRequest();
        logRequest.setEmail("double_login@test.pl");
        logRequest.setPassword("password123");

        // First login
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists());

        // Second login (should succeed and either overwrite or recreate refresh token without constraint violation)
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists());
    }
}
