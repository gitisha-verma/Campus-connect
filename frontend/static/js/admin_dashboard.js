document.addEventListener("DOMContentLoaded", function () {
    const navigationLinks = document.querySelectorAll(
        ".admin-navigation .nav-link"
    );

    if (!navigationLinks.length) {
        return;
    }

    navigationLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            navigationLinks.forEach(function (navigationLink) {
                navigationLink.classList.remove("active");
            });

            link.classList.add("active");
        });
    });
});
