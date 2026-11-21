import { sendChatMessage } from "./backendApi.js";

const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");


// =====================================
// EVENT LISTENERS
// =====================================

sendButton.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        if (!sendButton.disabled) {
            sendMessage();
        }
    }

});


// =====================================
// SEND MESSAGE
// =====================================
async function sendMessage() {

    const message = userInput.value.trim();

    if (message === "" || sendButton.disabled) {
        return;
    }

    addMessage(message, "user");

    userInput.value = "";

    sendButton.disabled = true;

    try {

        const response = await sendChatMessage(message);

        addMessage(response.reply, "assistant");

    } catch (error) {

        console.error("Chat error:", error);

        addMessage(
            "Sorry, something went wrong.",
            "assistant"
        );

    } finally {

        sendButton.disabled = false;

    }
}

// =====================================
// DISPLAY MESSAGE
// =====================================

function addMessage(message, sender) {

    const messageElement = document.createElement("div");

    messageElement.classList.add("message", sender);

    messageElement.textContent = message;

    chatMessages.appendChild(messageElement);

    chatMessages.scrollTop = chatMessages.scrollHeight;

}