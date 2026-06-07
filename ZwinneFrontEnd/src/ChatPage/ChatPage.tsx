import { useState, useEffect, useRef } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { ENDPOINTS, fetchWithAuth } from "../backendConnection";
import { Client } from "@stomp/stompjs";
import Top from "../MainPage/components/top";
import "./ChatPage.css";

interface Uzytkownik {
    id: number;
    email: string;
    imie: string;
    nazwisko: string;
    rola: string;
}

interface ChatMessage {
    id: number;
    nadawca: Uzytkownik;
    tresc: string;
    dataWyslania: string;
}

function ChatPage() {
    const navigate = useNavigate();
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    const currentUserStr = localStorage.getItem("currentUser");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

    // Pobranie historii czatu publicznego
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetchWithAuth(ENDPOINTS.chat.getPublicHistory());
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                }
            } catch (err) {
                console.error("Błąd podczas pobierania historii czatu:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Łączenie z WebSocket (STOMP)
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const wsUrl = ENDPOINTS.chat.wsEndpoint().replace("http://", "ws://").replace("https://", "wss://");

        const client = new Client({
            brokerURL: wsUrl,
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: (str) => console.log("[STOMP General Chat] " + str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000
        });

        client.onConnect = () => {
            console.log("WebSocket connected for general chat");
            setConnected(true);
            
            // Subskrypcja czatu ogólnego
            client.subscribe("/topic/public", (msg) => {
                const incoming = JSON.parse(msg.body);
                setMessages(prev => [...prev, incoming]);
            });
        };

        client.onDisconnect = () => {
            setConnected(false);
        };

        client.onStompError = (frame) => {
            console.error("STOMP error: ", frame.body);
            setConnected(false);
        };

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
    }, []);

    // Autoprzewijanie
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = () => {
        if (!input.trim() || !stompClient || !connected) return;

        stompClient.publish({
            destination: "/app/chat.sendPublicMessage",
            body: JSON.stringify({ tresc: input })
        });
        setInput("");
    };

    return (
        <>
            <Top />
            <div className="gc-container">
                <div className="gc-header">
                    <div className="gc-title-section">
                        <h1>Czat Ogólny</h1>
                        <p className="gc-subtitle">
                            Kanał komunikacji dla wszystkich studentów i prowadzących
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: connected ? '#10b981' : '#ef4444',
                            display: 'inline-block'
                        }} />
                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                            {connected ? "Połączono" : "Brak połączenia"}
                        </span>
                    </div>
                </div>

                <div className="gc-card">
                    <div className="gc-messages">
                        {loading ? (
                            <span style={{ margin: 'auto', color: '#9ca3af' }}>Ładowanie wiadomości...</span>
                        ) : messages.length === 0 ? (
                            <span style={{ margin: 'auto', color: '#6b7280' }}>Brak wiadomości. Przywitaj się!</span>
                        ) : (
                            messages.map(msg => {
                                const isSelf = msg.nadawca?.id === currentUser?.id;
                                const isProw = msg.nadawca?.rola === "ROLE_PROWADZACY";
                                return (
                                    <div key={msg.id} className={`gc-message ${isSelf ? "gc-message-self" : "gc-message-other"}`}>
                                        {!isSelf && (
                                            <div className="gc-msg-header">
                                                <span className="gc-msg-sender">{msg.nadawca?.imie} {msg.nadawca?.nazwisko}</span>
                                                <span className={`gc-msg-role ${isProw ? "gc-msg-role-prow" : "gc-msg-role-stud"}`}>
                                                    {isProw ? "Prowadzący" : "Student"}
                                                </span>
                                                <span>{new Date(msg.dataWyslania).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
                                            </div>
                                        )}
                                        <div className="gc-msg-bubble">
                                            {msg.tresc}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="gc-input-area">
                        <input
                            type="text"
                            className="gc-input"
                            placeholder={connected ? "Napisz wiadomość..." : "Łączenie z czatem..."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                            disabled={!connected}
                        />
                        <button 
                            className="gc-send-btn" 
                            onClick={handleSendMessage}
                            disabled={!connected}
                        >
                            Wyślij
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ChatPage;
