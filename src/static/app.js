document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Replace the current activity data with the latest server state.
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants</h5>
            <ul class="participants-list"></ul>
          </div>
        `;

        const participantsList = activityCard.querySelector(".participants-list");
        details.participants.forEach((email) => {
          const participant = document.createElement("li");
          const participantEmail = document.createElement("span");
          participantEmail.textContent = email;

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "remove-participant";
          removeButton.setAttribute("aria-label", `Unregister ${email}`);
          removeButton.title = `Unregister ${email}`;
          removeButton.innerHTML = `
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="m19 6-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          `;
          removeButton.addEventListener("click", async () => {
            removeButton.disabled = true;

            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`,
                { method: "DELETE" }
              );
              const result = await response.json();

              if (!response.ok) {
                showMessage(result.detail || "Failed to unregister participant", "error");
                removeButton.disabled = false;
                return;
              }

              showMessage(result.message, "success");
              await fetchActivities();
            } catch (error) {
              showMessage("Failed to unregister participant. Please try again.", "error");
              removeButton.disabled = false;
              console.error("Error unregistering participant:", error);
            }
          });

          participant.append(participantEmail, removeButton);
          participantsList.appendChild(participant);
        });

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "participants-empty";
          emptyMessage.textContent = "No participants yet";
          activityCard.querySelector(".participants-section").appendChild(emptyMessage);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
