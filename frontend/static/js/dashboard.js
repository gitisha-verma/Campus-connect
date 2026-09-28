document.addEventListener("DOMContentLoaded", function () {

    // Load logged-in student's name
    fetch("/dashboard-data")
        .then(response => response.json())
        .then(data => {
            const studentName = document.getElementById("student-name");

            if (studentName) {
                studentName.textContent = data.studentName;
            }
        })
        .catch(error => {
            console.error("Error loading dashboard data:", error);
        });


    // Load events
    fetch("/api/events")
        .then(response => response.json())
        .then(events => {

            const eventCount = document.getElementById("event-count");
            const upcomingEvents = document.getElementById("upcoming-events");

            if (eventCount) {
                eventCount.textContent = `${events.length} Events`;
            }

            if (upcomingEvents) {
                upcomingEvents.innerHTML = "";

                events.slice(0, 3).forEach(event => {

                    const item = document.createElement("div");
                    item.className = "item";

                    item.innerHTML = `
                        <h3>${event.title}</h3>
                        <p>${event.date}, ${event.time}</p>
                    `;

                    upcomingEvents.appendChild(item);
                });
            }
        })
        .catch(error => {
            console.error("Error loading events:", error);
        });


    // Load notices
    fetch("/api/notices")
        .then(response => response.json())
        .then(notices => {

            const noticeCount = document.getElementById("notice-count");
            const latestNotices = document.getElementById("latest-notices");

            if (noticeCount) {
                noticeCount.textContent = `${notices.length} New Notices`;
            }

            if (latestNotices) {
                latestNotices.innerHTML = "";

                notices.slice(0, 3).forEach(notice => {

                    const item = document.createElement("div");
                    item.className = "item";

                    item.innerHTML = `
                        <h3>${notice.title}</h3>
                        <p>${notice.content}</p>
                    `;

                    latestNotices.appendChild(item);
                });
            }
        })
        .catch(error => {
            console.error("Error loading notices:", error);
        });


    // Load resources
    fetch("/api/resources")
        .then(response => response.json())
        .then(resources => {

            const resourceCount = document.getElementById("resource-count");

            if (resourceCount) {
                resourceCount.textContent = `${resources.length} Resources`;
            }
        })
        .catch(error => {
            console.error("Error loading resources:", error);
        });

});