let notices = [];

const noticesContainer = document.getElementById("noticesContainer");
const noNoticesMessage = document.getElementById("noNoticesMessage");
const noticeSearch = document.getElementById("noticeSearch");
const categoryFilter = document.getElementById("categoryFilter");

function displayNotices(noticesToDisplay) {
    noticesContainer.innerHTML = "";

    if (noticesToDisplay.length === 0) {
        noNoticesMessage.style.display = "block";
        return;
    }

    noNoticesMessage.style.display = "none";

    noticesToDisplay.forEach(function(notice) {
        const noticeElement = document.createElement("div");

        noticeElement.className = "notice-card";

        noticeElement.innerHTML = `
            <h2>${notice.title}</h2>
            <p><strong>Category:</strong> ${notice.category}</p>
            <p><strong>Date:</strong> ${notice.date}</p>
            <p>${notice.content}</p>
        `;

        noticesContainer.appendChild(noticeElement);
    });
}

function filterNotices() {
    const searchText = noticeSearch.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    const filteredNotices = notices.filter(function(notice) {
        const matchesSearch =
            notice.title.toLowerCase().includes(searchText) ||
            notice.content.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            notice.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayNotices(filteredNotices);
}

function loadNotices() {
    fetch("/api/notices")
        .then(function(response) {
            if (!response.ok) {
                throw new Error("Failed to load notices");
            }

            return response.json();
        })
        .then(function(data) {
            notices = data;
            displayNotices(notices);
        })
        .catch(function(error) {
            console.error("Error loading notices:", error);
            noNoticesMessage.style.display = "block";
            noNoticesMessage.textContent = "Unable to load notices.";
        });
}

noticeSearch.addEventListener("input", filterNotices);
categoryFilter.addEventListener("change", filterNotices);

loadNotices();