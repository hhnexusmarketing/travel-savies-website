if (!document.querySelector("#chat")) {
  const overlay = document.createElement("div");
  overlay.className = "chat-overlay";
  overlay.id = "chat-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="chat" id="chat" role="dialog" aria-modal="true" aria-labelledby="chat-title">
      <div class="chat-head">
        <img src="images/logo.png" alt="">
        <div>
          <strong id="chat-title">Travel Savies</strong>
          <span>We reply on WhatsApp</span>
        </div>
        <button class="chat-close" type="button" data-close-chat aria-label="Close chat">&times;</button>
      </div>
      <div class="chat-log" id="chat-log" aria-live="polite"></div>
      <div class="chat-choices" id="chat-choices"></div>
      <form class="chat-input" id="chat-form">
        <label class="sr" for="chat-text">Your message</label>
        <input id="chat-text" name="text" type="text" autocomplete="off" placeholder="Type here">
        <label class="sr" for="chat-service">Service</label>
        <select id="chat-service" hidden>
          <option value="">Choose a service</option>
          <option>Umrah &amp; Saudi Arabia</option>
          <option>Visit visa</option>
          <option>International tour or flight</option>
          <option>Lahore city tour</option>
          <option>Rent a car with driver</option>
          <option>SIM, biometric, or stamp paper</option>
          <option>Car transfer</option>
          <option>Something else</option>
        </select>
        <button class="btn btn-gold" type="submit">Send</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);
}

const overlay = document.querySelector("#chat-overlay");
const log = document.querySelector("#chat-log");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#chat-text");
const serviceSelect = document.querySelector("#chat-service");
const choices = document.querySelector("#chat-choices");

if (log && form && input && serviceSelect && choices) {

  const details = {
    name: "",
    phone: "",
    service: "",
    message: ""
  };

  let step = "name";

  function add(text, who) {
    const item = document.createElement("p");
    item.className = `bubble ${who}`;
    item.textContent = text;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function setChoices(items) {
    choices.innerHTML = "";
    items.forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = label;
      button.addEventListener("click", () => answer(label));
      choices.appendChild(button);
    });
  }

  function showText(placeholder) {
    serviceSelect.hidden = true;
    serviceSelect.value = "";
    input.hidden = false;
    input.disabled = false;
    input.placeholder = placeholder;
    setChoices([]);
    input.focus();
  }

  function showServiceMenu() {
    input.hidden = true;
    input.disabled = true;
    input.value = "";
    serviceSelect.hidden = false;
    serviceSelect.value = "";
    setChoices([]);
    serviceSelect.focus();
  }

  function ask(text, next, placeholder) {
    add(text, "bot");
    step = next;
    if (next === "service") {
      showServiceMenu();
      return;
    }
    showText(placeholder);
  }

  function whatsappText() {
    return [
      "Assalam o Alaikum. This is Travel Savies.",
      `My name is ${details.name}.`,
      `Phone: ${details.phone}.`,
      `Service: ${details.service}.`,
      `Details: ${details.message}.`
    ].join("\n");
  }

  function answer(value) {
    const text = value.trim();
    if (!text) return;

    if (step === "name") {
      if (text.length < 2) {
        add("Please tell me your name.", "bot");
        return;
      }
      details.name = text;
      add(text, "user");
      ask(`${details.name}, what is your phone number?`, "phone", "03xx xxxxxxx");
      return;
    }

    if (step === "phone") {
      const digits = text.replace(/\D/g, "");
      if (digits.length < 10) {
        add("Please enter a phone number with at least 10 digits.", "bot");
        return;
      }
      details.phone = text;
      add(text, "user");
      ask("Which service do you need?", "service");
      return;
    }

    if (step === "service") {
      details.service = text;
      add(text, "user");
      ask("Tell us the details: destination, dates, travellers, or pick-up.", "message", "Destination, dates, or pick-up");
      return;
    }

    if (step === "message") {
      if (text.length < 3) {
        add("Please add a few details so we can help.", "bot");
        return;
      }
      details.message = text;
      add(text, "user");
      step = "send";
      input.disabled = true;
      input.placeholder = "Ready to send";
      setChoices([]);
      add(`Here is your message:\n\n${whatsappText()}`, "bot");
      setChoices(["Send on WhatsApp", "Start again"]);
    }
  }

  function sendWhatsApp() {
    const url = `https://wa.me/923238477095?text=${encodeURIComponent(whatsappText())}`;
    window.open(url, "_blank", "noopener");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (step === "send") return;
    if (step === "service") {
      if (!serviceSelect.value) {
        add("Please choose a service from the list.", "bot");
        return;
      }
      answer(serviceSelect.value);
      return;
    }
    answer(input.value);
    input.value = "";
  });

  choices.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || step !== "send") return;
    if (button.textContent === "Send on WhatsApp") sendWhatsApp();
    if (button.textContent === "Start again") window.location.reload();
  });

  ask("Assalam o Alaikum. This is Travel Savies. What is your name?", "name", "Your name");

  function openChat() {
    overlay.hidden = false;
    overlay.classList.add("open");
    document.body.classList.add("chat-open");
    const menu = document.querySelector(".nav");
    const menuBtn = document.querySelector(".menu-btn");
    if (menu) menu.classList.remove("open");
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Open menu");
    }
    if (!input.hidden && !input.disabled) input.focus();
    else serviceSelect.focus();
  }

  function closeChat() {
    overlay.classList.remove("open");
    overlay.hidden = true;
    document.body.classList.remove("chat-open");
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest('a[href="contact.html"], [data-open-chat]');
    if (trigger) {
      event.preventDefault();
      openChat();
      return;
    }
    if (event.target === overlay || event.target.closest("[data-close-chat]")) closeChat();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("open")) closeChat();
  });

  if (location.pathname.endsWith("contact.html")) openChat();
}
