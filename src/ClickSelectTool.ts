/**
 * A live set of items that can be modified and is also expected to be used by outside code.
 */
interface LiveSet<T> {
  /**
   * Returns true if the set contains the specified item and returns false otherwise.
   */
  include(item: T): boolean;

  /**
   * Adds all of the specified items to the set.
   */
  addAll(items: T[]): void;

  /**
   * Removes all of the specified items from the set.
   */
  removeAll(items: T[]): void;

  /**
   * Empties the set of all items.
   */
  clear(): void;
}

/**
 * A tool that will handle the selecting and deselecting of elements in a target SVG document
 * in response to user clicks (more specifically mouse down events).
 */
export class ClickSelectTool {
  /**
   * @param target The target SVG document for the click-select tool.
   * @param selectedSVGElements A live set of selected SVG elements to be modified based on user interaction with the target SVG document.
   */
  constructor(public target: SVGSVGElement, private selectedSVGElements: LiveSet<SVGGraphicsElement>) {
    window.addEventListener('mousedown', event => this.handleMouseDown(event));
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.target === this.target) {
      !event.shiftKey ? this.selectedSVGElements.clear() : {};
      return;
    }

    if (!(event.target instanceof SVGGraphicsElement)) {
      // normally only SVG graphics elements are interacted with by the user
      return;
    } else if (!this.target.contains(event.target)) {
      // ignore mouse down events outside of the target SVG document
      return;
    }

    if (this.selectedSVGElements.include(event.target)) {
      event.shiftKey ? this.selectedSVGElements.removeAll([event.target]) : {};
      return;
    }

    // the mouse downed element is not already selected
    !event.shiftKey ? this.selectedSVGElements.clear() : {};
    this.selectedSVGElements.addAll([event.target]);
  }
}
