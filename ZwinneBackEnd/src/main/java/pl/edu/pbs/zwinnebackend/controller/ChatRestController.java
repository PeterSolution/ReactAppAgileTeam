package pl.edu.pbs.zwinnebackend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.edu.pbs.zwinnebackend.model.WiadomoscChat;
import pl.edu.pbs.zwinnebackend.service.ChatService;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatRestController {

    @Autowired
    private ChatService chatService;

    @GetMapping("/public")
    public ResponseEntity<List<WiadomoscChat>> getPublicChatHistory() {
        return ResponseEntity.ok(chatService.getPublicMessages());
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<WiadomoscChat>> getProjectChatHistory(@PathVariable Long projectId) {
        return ResponseEntity.ok(chatService.getProjectMessages(projectId));
    }
}
