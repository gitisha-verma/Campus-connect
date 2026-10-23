(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const searchInput =
            document.getElementById("discussion-search");

        const sortSelect =
            document.getElementById("discussion-sort");

        const clearFiltersButton =
            document.getElementById("clear-discussion-filters");

        const loadingState =
            document.getElementById("admin-discussions-loading-state");

        const errorState =
            document.getElementById("admin-discussions-error-state");

        const successState =
            document.getElementById("admin-discussions-success-state");

        const successMessage =
            document.getElementById("discussion-success-message");

        const emptyState =
            document.getElementById("admin-discussions-empty-state");

        const discussionList =
            document.getElementById("admin-discussions-list");

        const retryButton =
            document.getElementById("retry-discussions-button");

        const totalDiscussions =
            document.getElementById("total-discussions");

        const matchingDiscussions =
            document.getElementById("matching-discussions");

        const cardTemplate =
            document.getElementById("admin-discussion-card-template");

        const deleteDialog =
            document.getElementById("delete-discussion-dialog");

        const deleteDiscussionName =
            document.getElementById("delete-discussion-name");

        const cancelDeleteButton =
            document.getElementById("cancel-delete-discussion");

        const confirmDeleteButton =
            document.getElementById("confirm-delete-discussion");

        const requiredElements = [
            searchInput,
            sortSelect,
            clearFiltersButton,
            loadingState,
            errorState,
            successState,
            successMessage,
            emptyState,
            discussionList,
            retryButton,
            totalDiscussions,
            matchingDiscussions,
            cardTemplate,
            deleteDialog,
            deleteDiscussionName,
            cancelDeleteButton,
            confirmDeleteButton
        ];

        if (requiredElements.some((element) => !element)) {
            console.error(
                "Admin discussions: required HTML elements are missing."
            );
            return;
        }

        const state = {
            discussions: [],
            selectedDiscussionId: null,
            selectedDiscussionTitle: ""
        };

        function showMessage(element, message) {
            element.textContent = message;
            element.hidden = false;
        }

        function hideMessage(element) {
            element.hidden = true;
        }

        function normalizeDiscussion(discussion) {
            return {
                id: discussion.id,
                title: String(discussion.title ?? ""),
                content: String(discussion.content ?? ""),
                createdAt: String(discussion.created_at ?? ""),
                author: String(discussion.author ?? "")
            };
        }

        function formatDate(dateValue) {
            if (!dateValue) {
                return "Date unavailable";
            }

            const date = new Date(dateValue);

            if (Number.isNaN(date.getTime())) {
                return dateValue;
            }

            return date.toLocaleString();
        }

        function updateSummary(matchingCount) {
            totalDiscussions.textContent =
                String(state.discussions.length);

            matchingDiscussions.textContent =
                String(matchingCount);
        }

        function createDiscussionCard(discussion) {
            const card =
                cardTemplate.content.cloneNode(true);

            const article =
                card.querySelector(".discussion-management-card");

            const title =
                card.querySelector(".discussion-card-title");

            const preview =
                card.querySelector(".discussion-card-preview");

            const author =
                card.querySelector(".discussion-card-author");

            const date =
                card.querySelector(".discussion-card-date");

            const viewButton =
                card.querySelector(".discussion-view-button");

            const moderateButton =
                card.querySelector(".discussion-moderate-button");

            const deleteButton =
                card.querySelector(".discussion-delete-button");

            title.textContent =
                discussion.title || "Untitled discussion";

            preview.textContent =
                discussion.content || "No discussion content available.";

            author.textContent =
                discussion.author
                    ? `By ${discussion.author}`
                    : "Author unavailable";

            date.textContent =
                formatDate(discussion.createdAt);

            if (article) {
                article.dataset.discussionId =
                    String(discussion.id);
            }

            if (viewButton) {
                viewButton.addEventListener("click", () => {
                    viewDiscussion(discussion);
                });
            }

            if (moderateButton) {
                moderateButton.addEventListener("click", () => {
                    handleModerate(discussion);
                });
            }

            if (deleteButton) {
                deleteButton.addEventListener("click", () => {
                    openDeleteDialog(discussion);
                });
            }

            return card;
        }

        function getFilteredAndSortedDiscussions() {
            const query =
                searchInput.value.trim().toLowerCase();

            const sortOrder =
                sortSelect.value;

            const filtered =
                state.discussions.filter((discussion) => {
                    const searchableText = [
                        discussion.title,
                        discussion.content,
                        discussion.author
                    ]
                        .join(" ")
                        .toLowerCase();

                    return searchableText.includes(query);
                });

            filtered.sort((first, second) => {
                const firstTime =
                    new Date(first.createdAt).getTime();

                const secondTime =
                    new Date(second.createdAt).getTime();

                if (
                    Number.isNaN(firstTime) ||
                    Number.isNaN(secondTime)
                ) {
                    return 0;
                }

                return sortOrder === "oldest"
                    ? firstTime - secondTime
                    : secondTime - firstTime;
            });

            return filtered;
        }

        function renderDiscussions() {
            const discussions =
                getFilteredAndSortedDiscussions();

            discussionList.replaceChildren();

            discussions.forEach((discussion) => {
                discussionList.appendChild(
                    createDiscussionCard(discussion)
                );
            });

            updateSummary(discussions.length);

            if (state.discussions.length === 0) {
                emptyState.hidden = false;

                const heading =
                    emptyState.querySelector("h3");

                const description =
                    emptyState.querySelector("p");

                if (heading) {
                    heading.textContent =
                        "No discussions available";
                }

                if (description) {
                    description.textContent =
                        "Discussions will appear here when they are available.";
                }

                return;
            }

            if (discussions.length === 0) {
                emptyState.hidden = false;

                const heading =
                    emptyState.querySelector("h3");

                const description =
                    emptyState.querySelector("p");

                if (heading) {
                    heading.textContent =
                        "No matching discussions";
                }

                if (description) {
                    description.textContent =
                        "Try changing your search or sorting options.";
                }

                return;
            }

            emptyState.hidden = true;
        }

        async function loadDiscussions() {
            loadingState.hidden = false;
            hideMessage(errorState);
            hideMessage(successState);
            emptyState.hidden = true;
            discussionList.replaceChildren();

            try {
                const response = await fetch(
                    "/api/discussions",
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json"
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to load discussions (HTTP ${response.status}).`
                    );
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error(
                        "The discussions API returned an unexpected response."
                    );
                }

                state.discussions =
                    data.map(normalizeDiscussion);

                renderDiscussions();
            } catch (error) {
                console.error(
                    "Unable to load discussions:",
                    error
                );

                showMessage(
                    errorState,
                    "Discussions could not be loaded. Please try again."
                );

                emptyState.hidden = true;
                discussionList.replaceChildren();

                updateSummary(0);
            } finally {
                loadingState.hidden = true;
            }
        }

        function viewDiscussion(discussion) {
            if (!discussion.id) {
                showMessage(
                    errorState,
                    "This discussion does not have a valid ID."
                );
                return;
            }

            /*
             * The existing backend has:
             * /discussion/<discussion_id>
             *
             * This opens the existing discussion detail page.
             */
            window.location.href =
                `/discussion/${encodeURIComponent(discussion.id)}`;
        }

        function handleModerate(discussion) {
            /*
             * No admin moderation API has been confirmed yet.
             * Gitisha can connect this button to the backend later.
             */
            showMessage(
                successState,
                "Moderation is ready for backend integration."
            );

            console.info(
                "Moderate discussion:",
                discussion.id
            );
        }

        function openDeleteDialog(discussion) {
            state.selectedDiscussionId =
                discussion.id;

            state.selectedDiscussionTitle =
                discussion.title ||
                "this discussion";

            deleteDiscussionName.textContent =
                state.selectedDiscussionTitle;

            hideMessage(errorState);
            hideMessage(successState);

            if (typeof deleteDialog.showModal === "function") {
                deleteDialog.showModal();
            } else {
                deleteDialog.setAttribute(
                    "open",
                    ""
                );
            }
        }

        function closeDeleteDialog() {
            state.selectedDiscussionId = null;
            state.selectedDiscussionTitle = "";

            if (deleteDialog.open) {
                deleteDialog.close();
            } else {
                deleteDialog.removeAttribute("open");
            }
        }

        async function deleteDiscussion() {
            if (!state.selectedDiscussionId) {
                closeDeleteDialog();

                showMessage(
                    errorState,
                    "No discussion was selected."
                );

                return;
            }

            /*
             * IMPORTANT:
             * There is currently no confirmed admin DELETE
             * endpoint in the backend.
             *
             * Do not send a fake DELETE request.
             * Gitisha will connect this function to the
             * real admin API during backend integration.
             */

            console.info(
                "Delete requested for discussion:",
                state.selectedDiscussionId
            );

            closeDeleteDialog();

            showMessage(
                successState,
                "Delete action is ready for backend integration."
            );
        }

        function clearFilters() {
            searchInput.value = "";
            sortSelect.value = "newest";

            hideMessage(errorState);
            hideMessage(successState);

            renderDiscussions();
        }

        searchInput.addEventListener(
            "input",
            renderDiscussions
        );

        sortSelect.addEventListener(
            "change",
            renderDiscussions
        );

        clearFiltersButton.addEventListener(
            "click",
            clearFilters
        );

        retryButton.addEventListener(
            "click",
            loadDiscussions
        );

        cancelDeleteButton.addEventListener(
            "click",
            closeDeleteDialog
        );

        confirmDeleteButton.addEventListener(
            "click",
            deleteDiscussion
        );

        deleteDialog.addEventListener(
            "cancel",
            (event) => {
                event.preventDefault();
                closeDeleteDialog();
            }
        );

        loadDiscussions();
    });
})();
