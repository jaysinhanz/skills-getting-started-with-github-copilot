document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityCardTemplate = document.getElementById("activity-card-template");
  const participantTemplate = document.getElementById("participant-template");
  const signupButton = signupForm.querySelector('button[type="submit"]');

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load activities: ${response.status}`);
      }

      const activities = await response.json();

      // Clear loading message
      activitiesList.replaceChildren();
      activitySelect.length = 1;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = activityCardTemplate.content.firstElementChild.cloneNode(true);
        const participantsList = activityCard.querySelector(".participants-list");

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.dataset.activity = name;
        activityCard.querySelector("h4").textContent = name;
        activityCard.querySelector(".activity-description").textContent = details.description;
        activityCard.querySelector(".activity-schedule").textContent = `Schedule: ${details.schedule}`;
        activityCard.querySelector(".activity-availability").textContent = `Availability: ${spotsLeft} spots left`;

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("li");
          emptyMessage.className = "no-participants";
          emptyMessage.textContent = "No participants yet";
          participantsList.appendChild(emptyMessage);
        } else {
          details.participants.forEach((email) => {
            const participant = participantTemplate.content.firstElementChild.cloneNode(true);
            participant.querySelector(".participant-email").textContent = email;
            const removeButton = participant.querySelector(".participant-remove");
            removeButton.dataset.email = email;
            removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            participantsList.appendChild(participant);
          });
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
      return true;
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
      return false;
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const activity = document.getElementById("activity").value;

    signupButton.disabled = true;
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        if (!await fetchActivities()) {
          messageDiv.textContent = `${result.message} The activity list could not be refreshed; reload the page to see the latest details.`;
          messageDiv.className = "error";
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    } finally {
      signupButton.disabled = false;
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".participant-remove");
    if (!removeButton) {
      return;
    }

    const activityCard = removeButton.closest(".activity-card");
    const activity = activityCard.dataset.activity;
    const email = removeButton.dataset.email;
    removeButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      messageDiv.textContent = result.message || result.detail || "An error occurred";
      messageDiv.className = response.ok ? "success" : "error";
      messageDiv.classList.remove("hidden");

      if (response.ok) {
        await fetchActivities();
      }
    } catch (error) {
      messageDiv.textContent = "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    } finally {
      if (removeButton.isConnected) {
        removeButton.disabled = false;
      }
    }
  });

  // Initialize app
  fetchActivities();
});
