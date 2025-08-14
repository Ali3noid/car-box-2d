// controls.js
// Module providing keyboard controls for interacting with the simulation.
// Supports pausing/resuming the physics, resetting the simulation and
// adjusting camera zoom. The caller should supply an object with
// appropriate callbacks to perform these actions.

/**
 * Set up global keyboard handlers.
 *
 * When the user presses specific keys, the corresponding callback on
 * the provided `actions` object is invoked. The keys are:
 *  - Spacebar: toggle pause/resume
 *  - 'R' or 'r': reset the simulation
 *  - '+' or '=': zoom in
 *  - '-' or '_': zoom out
 *
 * @param {{ togglePause: Function, reset: Function, zoomIn: Function, zoomOut: Function }} actions
 *   An object containing callbacks for each supported action.
 */
export function setupControls(actions) {
  window.addEventListener('keydown', (e) => {
    // Avoid triggering controls when focus is on an input element
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    switch (e.key) {
      case ' ':
        e.preventDefault();
        actions.togglePause();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        actions.reset();
        break;
      case '+':
      case '=': // Allow both plus and equal keys for convenience
        e.preventDefault();
        actions.zoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        actions.zoomOut();
        break;
      default:
        break;
    }
  });
}