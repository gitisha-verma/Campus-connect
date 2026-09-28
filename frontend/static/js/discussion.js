document.addEventListener("DOMContentLoaded", function () {
    const createForm = document.getElementById("create-discussion-form");

    if (createForm) {
        const titleInput = document.getElementById("discussion-title");
        const contentInput = document.getElementById("discussion-content");
        const titleError = document.getElementById("discussion-title-error");
        const contentError = document.getElementById("discussion-content-error");

        createForm.addEventListener("submit", function (event) {
            let isValid = true;

            titleError.textContent = "";
            contentError.textContent = "";

            if (titleInput.value.trim() === "") {
                titleError.textContent = "Discussion title cannot be empty.";
                isValid = false;
            }

            if (contentInput.value.trim() === "") {
                contentError.textContent = "Discussion content cannot be empty.";
                isValid = false;
            }

            if (!isValid) {
                event.preventDefault();
            }
        });
    }

    const replyForm = document.getElementById("reply-form");

    if (replyForm) {
        const replyInput = document.getElementById("reply-content");
        const replyError = document.getElementById("reply-content-error");

        replyForm.addEventListener("submit", function (event) {
            replyError.textContent = "";

            if (replyInput.value.trim() === "") {
                replyError.textContent = "Reply cannot be empty.";
                event.preventDefault();
            }
        });
    }
});
