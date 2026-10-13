(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("create-notice-form");
        const titleInput = document.getElementById("notice-title");
        const categoryInput = document.getElementById("notice-category");
        const dateInput = document.getElementById("notice-date");
        const contentInput = document.getElementById("notice-content");
        const searchInput = document.getElementById("notice-search");
        const categoryFilter = document.getElementById("notice-category-filter");
        const noticeList = document.getElementById("notices-management-list");
        const loadingState = document.getElementById("notice-loading-state");
        const errorState = document.getElementById("notice-error-state");
        const errorMessage = document.getElementById("notice-error-message");
        const retryButton = document.getElementById("retry-load-notices");
        const successState = document.getElementById("notice-success-state");
        const emptyState = document.getElementById("notice-empty-state");
        const totalNotices = document.getElementById("total-notices");
        const recentNotices = document.getElementById("recent-notices");
        const categoryCount = document.getElementById("notice-categories-count");

        const requiredElements = [
            form,
            titleInput,
            categoryInput,
            dateInput,
            contentInput,
            searchInput,
            categoryFilter,
            noticeList,
            loadingState,
            errorState,
            errorMessage,
            retryButton,
            successState,
            emptyState,
            totalNotices,
            recentNotices,
            categoryCount
        ];

        if (requiredElements.some((element) => !element)) {
            console.error(
                "Admin notices: required HTML elements are missing."
            );
            return;
        }

        const state = {
            notices: [],
            editingId: null,
            submitting: false
        };

        function showMessage(element, message) {
            if (element === errorState) {
                errorMessage.textContent = message;
            } else {
                element.textContent = message;
            }
            element.hidden = false;
        }

        function hideMessage(element) {
            element.hidden = true;
        }

        function normalizeNotice(notice) {
            return {
                id: notice.id,
                title: String(notice.title ?? ""),
                content: String(notice.content ?? ""),
                date: String(notice.date ?? ""),
                category: String(notice.category ?? "General")
            };
        }

        function updateSummary() {
            totalNotices.textContent = String(state.notices.length);

            categoryCount.textContent = String(
                new Set(
                    state.notices.map((notice) => notice.category)
                ).size
            );

            const now = new Date();
            now.setHours(23, 59, 59, 999);

            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            const recentCount = state.notices.filter((notice) => {
                if (!notice.date) {
                    return false;
                }

                const date = new Date(`${notice.date}T00:00:00`);

                return (
                    !Number.isNaN(date.getTime()) &&
                    date >= sevenDaysAgo &&
                    date <= now
                );
            }).length;

            recentNotices.textContent = String(recentCount);
        }

        function createNoticeCard(notice) {
            const card = document.createElement("article");
            card.className = "notice-item";

            const title = document.createElement("h4");
            title.textContent = notice.title;

            const preview = document.createElement("p");
            preview.className = "notice-preview";
            preview.textContent =
                notice.content.length > 180
                    ? `${notice.content.slice(0, 180)}...`
                    : notice.content;

            const metadata = document.createElement("div");
            metadata.className = "notice-meta";

            const date = document.createElement("span");
            date.textContent = notice.date || "No date";

            const category = document.createElement("span");
            category.className = "notice-badge";
            category.textContent = notice.category;

            metadata.append(date, category);
            card.append(title, preview, metadata);

            const actions = document.createElement("div");
            actions.className = "notice-item-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "notice-action";
            editButton.textContent = "Edit";
            editButton.dataset.action = "edit";
            editButton.dataset.noticeId = String(notice.id);
            editButton.setAttribute(
                "aria-label",
                `Edit notice: ${notice.title}`
            );

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "notice-action delete-action";
            deleteButton.textContent = "Delete";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.noticeId = String(notice.id);
            deleteButton.setAttribute(
                "aria-label",
                `Delete notice: ${notice.title}`
            );

            actions.append(editButton, deleteButton);
            card.append(actions);

            return card;
        }

        function renderNotices() {
            const query = searchInput.value.trim().toLowerCase();
            const selectedCategory = categoryFilter.value;

            const filteredNotices = state.notices.filter((notice) => {
                const matchesSearch =
                    notice.title.toLowerCase().includes(query) ||
                    notice.content.toLowerCase().includes(query);

                const matchesCategory =
                    !selectedCategory ||
                    notice.category === selectedCategory;

                return matchesSearch && matchesCategory;
            });

            noticeList.replaceChildren();

            filteredNotices.forEach((notice) => {
                noticeList.appendChild(createNoticeCard(notice));
            });

            const heading = emptyState.querySelector("h4");
            const description = emptyState.querySelector("p");

            if (heading && description) {
                if (state.notices.length === 0) {
                    heading.textContent = "No notices available";
                    description.textContent =
                        "Notices will appear here when they are available.";
                    emptyState.hidden = false;
                } else if (filteredNotices.length === 0) {
                    heading.textContent = "No matching notices";
                    description.textContent =
                        "Try changing your search or category filter.";
                    emptyState.hidden = false;
                } else {
                    emptyState.hidden = true;
                }
            }

            updateSummary();
        }

        async function loadNotices() {
            loadingState.hidden = false;
            hideMessage(errorState);
            hideMessage(successState);
            emptyState.hidden = true;
            noticeList.replaceChildren();

            try {
                const response = await fetch("/api/notices", {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(
                        `Failed to load notices (HTTP ${response.status}).`
                    );
                }

                const data = await response.json();
                const notices = Array.isArray(data)
                    ? data
                    : data.notices;

                if (!Array.isArray(notices)) {
                    throw new Error(
                        "The notices API returned an unexpected response."
                    );
                }

                state.notices = notices.map(normalizeNotice);
                renderNotices();
            } catch (error) {
                console.error("Unable to load notices:", error);

                showMessage(
                    errorState,
            errorMessage,
            retryButton,
                    "Notices could not be loaded. Please try again later."
                );

                emptyState.hidden = true;
                noticeList.replaceChildren();
            } finally {
                loadingState.hidden = true;
            }
        }

        searchInput.addEventListener("input", renderNotices);
        categoryFilter.addEventListener("change", renderNotices);
        retryButton.addEventListener("click", loadNotices);
        loadNotices();
    });

})();