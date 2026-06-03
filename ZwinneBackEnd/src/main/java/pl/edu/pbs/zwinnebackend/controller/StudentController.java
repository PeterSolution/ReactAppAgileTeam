package pl.edu.pbs.zwinnebackend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<List<Uzytkownik>> getAllStudents() {
        return ResponseEntity.ok(userService.getAllStudents());
    }
}
