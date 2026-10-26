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
        const submitButton = form?.querySelector('[type="submit"]');

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
            categoryCount,
            submitButton
        ];

        if (requiredElements.some((element) => !element)) {
            console.error(
                "Admin notices: required HTML elements are missing."
            );
            return;
        }

        const API_URL = "/api/admin/notices";

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

        function showError(message) {
            hideMessage(successState);
            showMessage(errorState, message);
        }

        function showSuccess(message) {
            hideMessage(errorState);
            showMessage(successState, message);
        }

        async function getErrorMessage(response) {
            try {
                const data = await response.json();

                if (typeof data.message === "string") {
                    return data.message;
                }

                if (typeof data.error === "string") {
                    return data.error;
                }
            } catch {
                // Use the default message if the response is not JSON.
            }

            if (response.status === 401 || response.status === 403) {
                return "Your administrator session may have expired. Please log in again.";
            }

            if (response.status >= 500) {
                return "A server error occurred. Please try again later.";
            }

            return `The request could not be completed (HTTP ${response.status}).`;
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
                const response = await fetch(API_URL, {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    },
                    credentials: "same-origin"
                });

                if (!response.ok) {
                    throw new Error(await getErrorMessage(response));
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

                showError(
                    error.message ||
                    "Notices could not be loaded. Please try again later."
                );

                emptyState.hidden = true;
                noticeList.replaceChildren();
            } finally {
                loadingState.hidden = true;
            }
        }

        function resetForm() {
            form.reset();
            state.editingId = null;
            submitButton.textContent = "Create Notice";
        }

        function startEditing(notice) {
            hideMessage(errorState);
            hideMessage(successState);

            state.editingId = notice.id;

            titleInput.value = notice.title;
            categoryInput.value = notice.category;
            dateInput.value = notice.date;
            contentInput.value = notice.content;

            submitButton.textContent = "Update Notice";

            form.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            titleInput.focus();
        }

        async function handleFormSubmit(event) {
            event.preventDefault();

            if (state.submitting) {
                return;
            }

            hideMessage(errorState);
            hideMessage(successState);

            const title = titleInput.value.trim();
            const content = contentInput.value.trim();
            const category = categoryInput.value;
            const date = dateInput.value;

            if (!title || !content || !category || !date) {
                showError("Please complete all notice fields.");
                return;
            }

            if (!form.reportValidity()) {
                return;
            }

            const payload = {
                title,
                content,
                category,
                date
            };

            const editing = state.editingId !== null;
            const requestUrl = editing
                ? `${API_URL}/${encodeURIComponent(state.editingId)}`
                : API_URL;

            state.submitting = true;
            submitButton.disabled = true;

            submitButton.textContent = editing
                ? "Updating..."
                : "Creating...";

            try {
                const response = await fetch(requestUrl, {
                    method: editing ? "PUT" : "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(await getErrorMessage(response));
                }

                resetForm();

                await loadNotices();

                showSuccess(
                    editing
                        ? "Notice updated successfully."
                        : "Notice created successfully."
                );
            } catch (error) {
                console.error("Unable to save notice:", error);

                showError(
                    error.message ||
                    "The notice could not be saved. Please try again."
                );
            } finally {
                state.submitting = false;
                submitButton.disabled = false;

                submitButton.textContent = state.editingId !== null
                    ? "Update Notice"
                    : "Create Notice";
            }
        }

        async function deleteNotice(noticeId) {
            if (state.submitting) {
                return;
            }

            const notice = state.notices.find(
                (item) => String(item.id) === String(noticeId)
            );

            if (!notice) {
                showError("This notice could not be found. Please reload the list.");
                return;
            }

            const dialog = document.getElementById("delete-notice-dialog");
            const cancelButton = document.getElementById("cancel-delete-notice");
            const confirmButton = document.getElementById("confirm-delete-notice");
            const description = document.getElementById("delete-notice-description");

            description.textContent =
                `Are you sure you want to delete "${notice.title}"? This action cannot be undone.`;

            dialog.hidden = false;
            cancelButton.focus();

            const confirmed = await new Promise((resolve) => {
                const cleanup = () => {
                    confirmButton.removeEventListener("click", onConfirm);
                    cancelButton.removeEventListener("click", onCancel);
                    dialog.removeEventListener("keydown", onKeydown);
                };

                const finish = (result) => {
                    cleanup();
                    dialog.hidden = true;
                    resolve(result);
                };

                const onConfirm = () => finish(true);
                const onCancel = () => finish(false);
                const onKeydown = (event) => {
                    if (event.key === "Escape") {
                        finish(false);
                    }
                };

                confirmButton.addEventListener("click", onConfirm);
                cancelButton.addEventListener("click", onCancel);
                dialog.addEventListener("keydown", onKeydown);
            });

            if (!confirmed) {
                return;
            }

            hideMessage(errorState);
            hideMessage(successState);

            state.submitting = true;

            try {
                const response = await fetch(
                    `${API_URL}/${encodeURIComponent(noticeId)}`,
                    {
                        method: "DELETE",
                        headers: {
                            Accept: "application/json"
                        },
                        credentials: "same-origin"
                    }
                );

                if (!response.ok) {
                    throw new Error(await getErrorMessage(response));
                }

                if (String(state.editingId) === String(noticeId)) {
                    resetForm();
                }

                await loadNotices();

                showSuccess("Notice deleted successfully.");
            } catch (error) {
                console.error("Unable to delete notice:", error);

                showError(
                    error.message ||
                    "The notice could not be deleted. Please try again."
                );
            } finally {
                state.submitting = false;
            }
        }

        form.addEventListener("submit", handleFormSubmit);

        noticeList.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action]");

            if (!button || !noticeList.contains(button)) {
                return;
            }

            const noticeId = button.dataset.noticeId;
            const action = button.dataset.action;

            if (action === "edit") {
                const notice = state.notices.find(
                    (item) => String(item.id) === String(noticeId)
                );

                if (notice) {
                    startEditing(notice);
                }
            } else if (action === "delete") {
                deleteNotice(noticeId);
            }
        });

        searchInput.addEventListener("input", renderNotices);
        categoryFilter.addEventListener("change", renderNotices);
        retryButton.addEventListener("click", loadNotices);

        loadNotices();
    });

})();
