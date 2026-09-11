document.addEventListener("DOMContentLoaded", function () {
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
});