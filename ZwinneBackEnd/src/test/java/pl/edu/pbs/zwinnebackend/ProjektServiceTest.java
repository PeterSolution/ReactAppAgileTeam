package pl.edu.pbs.zwinnebackend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import pl.edu.pbs.zwinnebackend.model.Projekt;
import pl.edu.pbs.zwinnebackend.model.Rola;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.repository.ProjektRepository;
import pl.edu.pbs.zwinnebackend.security.UserPrincipal;
import pl.edu.pbs.zwinnebackend.service.ProjektService;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProjektServiceTest {

    @Mock
    private ProjektRepository projektRepository;

    @InjectMocks
    private ProjektService projektService;

    @Test
    public void getAllProjects_AsLecturer_ReturnsAll() {
        // Arrange
        Uzytkownik lecturer = Uzytkownik.builder()
                .id(1L)
                .email("wykladowca@test.pl")
                .rola(Rola.ROLE_PROWADZACY)
                .build();

        UserPrincipal principal = new UserPrincipal(
                1L, 
                lecturer.getEmail(), 
                "", 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_PROWADZACY")), 
                lecturer
        );

        Projekt project = new Projekt();
        Page<Projekt> pageResult = new PageImpl<>(List.of(project));

        when(projektRepository.findAll(any(PageRequest.class))).thenReturn(pageResult);

        // Act
        Page<Projekt> result = projektService.getAllProjects("", 0, 10, "utworzony", "DESC", principal);

        // Assert
        assertEquals(1, result.getTotalElements());
        verify(projektRepository, times(1)).findAll(any(PageRequest.class));
        verify(projektRepository, never()).findByStudenciId(anyLong(), any());
    }

    @Test
    public void getAllProjects_AsStudent_ReturnsAssignedOnly() {
        // Arrange
        Uzytkownik student = Uzytkownik.builder()
                .id(2L)
                .email("student@test.pl")
                .rola(Rola.ROLE_STUDENT)
                .build();

        UserPrincipal principal = new UserPrincipal(
                2L, 
                student.getEmail(), 
                "", 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_STUDENT")), 
                student
        );

        Projekt project = new Projekt();
        Page<Projekt> pageResult = new PageImpl<>(List.of(project));

        when(projektRepository.findByStudenciId(eq(2L), any(PageRequest.class))).thenReturn(pageResult);

        // Act
        Page<Projekt> result = projektService.getAllProjects("", 0, 10, "utworzony", "DESC", principal);

        // Assert
        assertEquals(1, result.getTotalElements());
        verify(projektRepository, times(1)).findByStudenciId(eq(2L), any(PageRequest.class));
        verify(projektRepository, never()).findAll(any(PageRequest.class));
    }
}
