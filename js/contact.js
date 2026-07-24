// Initialize EmailJS with your Public Key
(function () {
    emailjs.init({
        publicKey: "L2i50ZlmRnY47fXEt", // Replace with your EmailJS Public Key
    });
})();

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Change button state to indicate sending
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            formStatus.textContent = '';

            // Send form data via EmailJS
            emailjs.sendForm('service_7l9hsuf', 'template_ljghifm', this)
                .then(() => {
                    // Success Feedback
                    formStatus.style.color = '#10b981'; // Green color
                    formStatus.textContent = 'Message sent successfully! I will get back to you soon.';
                    contactForm.reset();
                })
                .catch((error) => {
                    // Error Feedback
                    console.error('EmailJS Error:', error);
                    formStatus.style.color = '#ef4444'; // Red color
                    formStatus.textContent = 'Failed to send message. Please try again later.';
                })
                .finally(() => {
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Message';
                });
        });
    }
});