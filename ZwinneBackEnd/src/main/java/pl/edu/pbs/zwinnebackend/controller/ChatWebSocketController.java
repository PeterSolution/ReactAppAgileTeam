package pl.edu.pbs.zwinnebackend.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;
import pl.edu.pbs.zwinnebackend.dto.ChatMessageRequest;
import pl.edu.pbs.zwinnebackend.model.WiadomoscChat;
import pl.edu.pbs.zwinnebackend.security.UserPrincipal;
import pl.edu.pbs.zwinnebackend.service.ChatService;

import java.security.Principal;

@Controller
@Slf4j
public class ChatWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatService chatService;

    @MessageMapping("/chat.sendPublicMessage")
    public void sendPublicMessage(@Payload ChatMessageRequest request, Principal principal) {
        if (principal == null) {
            log.warn("Niezautoryzowana próba wysłania wiadomości WebSocket");
            return;
        }

        UserPrincipal userPrincipal = (UserPrincipal) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
        WiadomoscChat message = chatService.savePublicMessage(userPrincipal.getId(), request.getTresc());

        // Rozsyłanie wiadomości do wszystkich subskrybentów kanału publicznego
        messagingTemplate.convertAndSend("/topic/public", message);
    }

    @MessageMapping("/chat.sendProjectMessage/{projectId}")
    public void sendProjectMessage(
            @DestinationVariable Long projectId,
            @Payload ChatMessageRequest request,
            Principal principal) {
        
        if (principal == null) {
            log.warn("Niezautoryzowana próba wysłania wiadomości WebSocket");
            return;
        }

        UserPrincipal userPrincipal = (UserPrincipal) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
        try {
            WiadomoscChat message = chatService.saveProjectMessage(userPrincipal.getId(), projectId, request.getTresc());
            // Rozsyłanie wiadomości do członków danej grupy projektowej
            messagingTemplate.convertAndSend("/topic/project/" + projectId, message);
        } catch (IllegalArgumentException ex) {
            log.warn("Błąd wysyłania wiadomości na czacie projektu: {}", ex.getMessage());
            // Można opcjonalnie wysłać wiadomość o błędzie bezpośrednio do nadawcy
        }
    }
}
