// Validation rules for Staff create/update. Mirrored (not literally shared)
// in `client/src/utils/staffValidation.js`. If you touch the rules here,
// update that file too.
export function validateStaffInput(input, { partial = false } = {}) {
  const errors = {};
  const { name, subject, phone, email } = input;

  if (!partial || name !== undefined) {
    if (!name || !name.trim()) errors.name = "Name is required";
    else if (name.trim().length > 100) errors.name = "Name must be under 100 characters";
  }
  if (!partial || subject !== undefined) {
    if (!subject || !String(subject).trim()) errors.subject = "Subject is required";
  }
  if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) {
    errors.phone = "Enter a valid phone number";
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
