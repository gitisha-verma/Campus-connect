const notices = [
    {
        id: 1,
        title: "Mid-Semester Examination Schedule",
        category: "Examination",
        date: "2026-09-15",
        description: "The mid-semester examination schedule has been released."
    },
    {
        id: 2,
        title: "Assignment Submission Deadline",
        category: "Academic",
        date: "2026-09-14",
        description: "Students must submit their pending assignments before the deadline."
    },
    {
        id: 3,
        title: "Campus Cultural Fest",
        category: "Events",
        date: "2026-09-12",
        description: "Registration is now open for the annual campus cultural fest."
    },
    {
        id: 4,
        title: "Library Timing Update",
        category: "General",
        date: "2026-09-10",
        description: "The library will remain open until 8 PM on weekdays."
    },
    {
        id: 5,
        title: "Internal Assessment Notice",
        category: "Academic",
        date: "2026-09-08",
        description: "Students are requested to check their internal assessment details."
    }
];

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
            <p>${notice.description}</p>
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
            notice.description.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            notice.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayNotices(filteredNotices);
}

noticeSearch.addEventListener("input", filterNotices);
categoryFilter.addEventListener("change", filterNotices);

displayNotices(notices);
