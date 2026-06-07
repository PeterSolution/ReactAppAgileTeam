package pl.edu.pbs.zwinnebackend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.edu.pbs.zwinnebackend.model.Projekt;
import pl.edu.pbs.zwinnebackend.model.Rola;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.repository.ProjektRepository;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;
import pl.edu.pbs.zwinnebackend.security.UserPrincipal;

@Service
public class ProjektService {

    @Autowired
    private ProjektRepository projektRepository;

    @Autowired
    private UzytkownikRepository uzytkownikRepository;



    public Page<Projekt> getAllProjects(String search, int page, int size, String sortBy, String direction, UserPrincipal currentUser) {
        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        boolean isLecturer = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(Rola.ROLE_PROWADZACY.name()));

        if (isLecturer) {
            // Prowadzący widzi wszystkie projekty
            if (search != null && !search.trim().isEmpty()) {
                return projektRepository.findByNazwaContainingIgnoreCase(search, pageable);
            }
            return projektRepository.findAll(pageable);
        } else {
            // Student widzi tylko projekty, do których jest przypisany
            if (search != null && !search.trim().isEmpty()) {
                return projektRepository.findByNazwaContainingIgnoreCaseAndStudenciId(search, currentUser.getId(), pageable);
            }
            return projektRepository.findByStudenciId(currentUser.getId(), pageable);
        }
    }

    public Projekt getProjectById(Long id) {
        return projektRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Projekt o ID " + id + " nie istnieje."));
    }

    @Transactional
    public Projekt createProject(Projekt projekt) {
        return projektRepository.save(projekt);
    }

    @Transactional
    public Projekt updateProject(Long id, Projekt details) {
        Projekt projekt = getProjectById(id);
        projekt.setNazwa(details.getNazwa());
        projekt.setOpis(details.getOpis());
        projekt.setDataOddania(details.getDataOddania());
        return projektRepository.save(projekt);
    }

    @Transactional
    public void deleteProject(Long id) {
        Projekt projekt = getProjectById(id);
        projektRepository.delete(projekt);
    }

    @Transactional
    public void addStudentToProject(Long projectId, Long studentId) {
        Projekt projekt = getProjectById(projectId);
        Uzytkownik student = uzytkownikRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Użytkownik o ID " + studentId + " nie istnieje."));

        if (student.getRola() != Rola.ROLE_STUDENT) {
            throw new IllegalArgumentException("Tylko użytkownicy o roli STUDENT mogą być przypisani do projektu.");
        }

        projekt.getStudenci().add(student);
        projektRepository.save(projekt);
    }

    @Transactional
    public void removeStudentFromProject(Long projectId, Long studentId) {
        Projekt projekt = getProjectById(projectId);
        Uzytkownik student = uzytkownikRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Użytkownik o ID " + studentId + " nie istnieje."));

        projekt.getStudenci().remove(student);
        projektRepository.save(projekt);
    }

    public List<Projekt> getAllProjects() {
        return projektRepository.findAll();
    }
}
