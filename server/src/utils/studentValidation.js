// Validation rules for Student create/update. Mirrored (not literally
// shared — client and server are separate packages with no shared
// workspace yet) in `client/src/utils/studentValidation.js`. If you touch
// the rules here, update that file too.
export function validateStudentInput(input, { partial = false } = {}) {
  const errors = {};
  const { name, rollNo, className, section, guardianPhone } = input;

  if (!partial || name !== undefined) {
    if (!name || !name.trim()) errors.name = "Name is required";
    else if (name.trim().length > 100) errors.name = "Name must be under 100 characters";
  }
  if (!partial || rollNo !== undefined) {
    if (!rollNo || !String(rollNo).trim()) errors.rollNo = "Roll number is required";
  }
  if (!partial || className !== undefined) {
    if (!className || !String(className).trim()) errors.className = "Class is required";
  }
  if (!partial || section !== undefined) {
    if (!section || !String(section).trim()) errors.section = "Section is required";
  }
  if (guardianPhone && !/^[0-9+\-\s]{7,15}$/.test(guardianPhone)) {
    errors.guardianPhone = "Enter a valid phone number";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
