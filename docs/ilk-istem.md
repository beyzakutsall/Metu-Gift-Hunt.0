# Metu-Gift-Hunt.0
I am developing a web-based campus exploration and gift-exchange platform specifically for METU (ODTÜ) students. The concept is inspired by Pokémon GO: students explore the campus, discover hidden collectible stickers/emojis, build their collection books, and hide items for other students to find.

I want to develop this project incrementally, starting with the authentication interface. For now, focus ONLY on the registration and login experience and the fundamental UI architecture. Do not implement the map, collection book, or game mechanics yet.

## 1. Technology Stack

Use:
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React for icons

If the project is not initialized, initialize it first. Check the existing project structure before making changes. Do not unnecessarily overwrite existing files.

## 2. Visual Identity and Design Direction

I want the application to feel like a playful, modern campus adventure game rather than a traditional university portal.

Design direction:
- Modern, clean, friendly, and slightly playful.
- Soft pastel colors combined with a few vibrant accent colors.
- Rounded corners and subtle shadows.
- Beautiful typography and generous spacing.
- Smooth transitions and subtle hover animations.
- Small decorative elements inspired by stickers, collectibles, treasure hunting, and exploration.
- Professional enough for a university student platform.

Avoid:
- Generic corporate dashboard designs.
- Excessive gradients.
- Overly childish cartoon interfaces.
- Unnecessary visual clutter.

Establish reusable design tokens for colors, typography, spacing, border radii, and shadows. Keep the design consistent throughout the application.

## 3. Authentication Page

Create a beautiful, responsive authentication experience with two modes:

### A. Register

Users who do not have an account should be able to register.

Fields:
- Username
- METU email address
- Password
- Confirm password

Requirements:
- Only accept official METU email addresses ending in @metu.edu.tr.
- Validate email format.
- Check that passwords match.
- Enforce a reasonable minimum password length.
- Show clear inline validation messages.
- Include a password visibility toggle.
- Include a checkbox for accepting the Terms of Service.
- Add a Register button.

After successful registration, display an email verification screen explaining that a verification link has been sent to the user's METU email.

### B. Login

Existing users should be able to log in using:
- METU email address
- Password

Requirements:
- Validate METU email format.
- Include a password visibility toggle.
- Include a Remember Me checkbox.
- Include a Forgot Password link.
- Add a Login button.
- Display friendly error messages for invalid credentials.

### C. Switching Between Modes

Users should easily switch between Login and Register.

For example:
"Already have an account? Log in"
"New to the adventure? Create an account"

Use a polished transition between the two modes without unnecessarily reloading the page.

## 4. Layout and UI Composition

Create a visually appealing authentication page.

Desktop:
- Use a two-column layout.
- Left side: branding, an illustration or decorative collectible-themed composition, and a short introduction.
- Right side: authentication form inside a clean card or visually separated section.

Mobile:
- Use a single-column layout.
- Keep the form comfortable to use.
- Make sure buttons and inputs are touch-friendly.

Application branding:
The platform is currently unnamed, so use a temporary placeholder name: "Campus Quest".

Include a short tagline:
"Explore your campus. Discover surprises. Build your collection."

## 5. Architecture

Keep the code modular and maintainable.

Suggested structure:

src/
  components/
    auth/
      LoginForm.tsx
      RegisterForm.tsx
      PasswordInput.tsx
      AuthLayout.tsx
    common/
      Button.tsx
      Input.tsx
  pages/
    AuthPage.tsx
    EmailVerification.tsx
  services/
    authService.ts
  types/
    auth.ts
  styles/
    globals.css
  App.tsx
  main.tsx

You can improve this structure if necessary.

## 6. Authentication Logic

For this initial stage, implement a clean authentication service abstraction.

Do not pretend that frontend-only authentication is secure.

If a backend is not available:
- Use a mock authentication service.
- Clearly separate mock logic from the UI.
- Simulate registration and login responses.
- Do not store plaintext passwords in localStorage.
- Make it easy to replace the mock service with a real backend later.

Prepare the interface for future integration with a backend API.

## 7. User Experience Details

- Add loading states when submitting forms.
- Prevent multiple submissions.
- Show success and error feedback.
- Provide accessible labels.
- Support keyboard navigation.
- Use appropriate input types and autocomplete attributes.
- Ensure responsive behavior.
- Make all visible buttons and links functional.

## 8. Development Instructions

Work step by step:

1. Inspect the existing project.
2. Set up the necessary dependencies.
3. Establish the global design system.
4. Build the authentication layout.
5. Implement registration.
6. Implement login.
7. Implement form validation.
8. Implement mock authentication.
9. Test the application and fix errors.

Do not build future application screens yet.

Before finishing:
- Run the development build.
- Fix TypeScript errors.
- Check responsive layouts.
- Explain the files you created and how authentication currently works.

The result should look like a polished, production-quality starting point for a campus exploration game.