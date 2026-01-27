import { User } from './types';

/**
 * Format user name for display:
 * - If person data exists: "FirstName Initial. LastName" (e.g. "Karen A. Shuña" if multiple last names) or "FirstName LastName"
 * - Fallback: firstName from flattened User or username
 */
export function formatUserName(user: User | null): string {
    if (!user) return 'Invitado';

    // Check for nested person object first
    if (user.person) {
        const { firstName, lastName } = user.person;
        if (!firstName || !lastName) return user.username;

        const lastNameParts = lastName.trim().split(/\s+/);

        // If multiple last names (e.g. "Alegria Shuña")
        if (lastNameParts.length > 1) {
            // "Alegria" -> "A."
            const firstLastName = lastNameParts[0];
            const secondLastName = lastNameParts.slice(1).join(' ');
            // Format: Karen A. Shuña
            return `${firstName} ${firstLastName.charAt(0)}. ${secondLastName}`;
        }

        // Single last name
        return `${firstName} ${lastName}`;
    }

    // Fallback to flattened fields or username
    return user.firstName || user.username;
}
