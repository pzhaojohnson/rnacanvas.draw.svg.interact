import { CoordinateSystem as SVGDocCoordinateSystem } from '@rnacanvas/draw.svg';

import { Box } from '@rnacanvas/boxes';

/**
 * A live set of items that may be modified and that is also referenced and used by outside code.
 */
interface LiveSet<T> {
  /**
   * Adds all of the specified items to the set.
   */
  addAll(items: T[]): void;

  /**
   * Clears the set of all items.
   */
  clear(): void;
}

function isSVGGraphicsElements(value: unknown): value is SVGGraphicsElement {
  return value instanceof SVGGraphicsElement;
}

/**
 * A rectangle that the user can drag over elements in a target SVG document
 * to select them.
 *
 * The DOM node(s) that make up a selecting rect are not meant to be directly modified
 * by outside code but rather only interacted with through the interface of this class.
 */
export class SelectingRect {
  /**
   * The coordinate system of the target SVG document.
   */
  private readonly targetSVGDocCoordinateSystem: SVGDocCoordinateSystem;

  /**
   * The DOM node that is the selecting rect.
   */
  private readonly domNode: SVGPathElement;

  /**
   * The line thickness of the selecting rect when the target SVG document
   * has scaling of 1.
   */
  private readonly defaultLineThickness = 0.625;

  /**
   * The most recent mouse down event.
   */
  private lastMouseDown: MouseEvent | undefined;

  /**
   * The X coordinate of the last mouse down event
   * (in the coordinate system of the target SVG document).
   */
  private lastMouseDownX = 0;

  /**
   * The Y coordinate of the last mouse down event
   * (in the coordinate system of the target SVG document).
   */
  private lastMouseDownY = 0;

  /**
   * To be set to true when the mouse is down.
   */
  private mouseIsDown = false;

  /**
   * Set to true when the selecting rect is being drawn
   * due to mouse dragging over the target SVG document.
   */
  private isDrawn = false;

  /**
   * The provided set of selected SVG elements will be modified
   * according to user interaction with the target SVG document
   * involving the selecting rect.
   *
   * @param targetSVGDoc
   * @param selectedSVGElements A live set of the currently selected SVG elements.
   */
  constructor(private targetSVGDoc: SVGSVGElement, private selectedSVGElements: LiveSet<SVGGraphicsElement>) {
    this.targetSVGDocCoordinateSystem = new SVGDocCoordinateSystem(targetSVGDoc);

    this.domNode = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    this.domNode.setAttribute('stroke', 'blue');
    this.refreshLineThickness();

    this.domNode.setAttribute('fill', 'blue');
    this.domNode.setAttribute('fill-opacity', '0.1');

    // watches for when the scaling of the target SVG document changes
    let scalingObserver = new MutationObserver(() => this.refreshLineThickness());
    scalingObserver.observe(targetSVGDoc, { attributes: true, attributeFilter: ['viewBox', 'width', 'height'] });

    this.domNode.style.pointerEvents = 'none';

    // set to be hidden by default
    this.domNode.style.visibility = 'hidden';

    window.addEventListener('mousedown', event => this.handleMouseDown(event));

    window.addEventListener('mousemove', event => this.handleMouseMove(event));

    window.addEventListener('mouseup', event => this.handleMouseUp(event));
  }

  /**
   * Updates the line thickness of the selecting rect
   * according to the current scaling of the drawing.
   */
  private refreshLineThickness(): void {
    // just assume that the target SVG document has equal horizontal and vertical scalings for now
    this.domNode.setAttribute(
      'stroke-width',
      `${this.defaultLineThickness / this.targetSVGDocCoordinateSystem.horizontalScaling}`,
    );
  }

  /**
   * Appends the selecting rect to the provided container node
   * (such as an SVG document that has been overlaid over the target SVG document).
   */
  appendTo(container: Node): void {
    container.appendChild(this.domNode);
  }

  /**
   * Removes the selecting rect from any parent container node that it is in.
   *
   * Has no effect if the selecting rect has no parent container node.
   */
  remove(): void {
    this.domNode.remove();
  }

  private handleMouseDown(event: MouseEvent): void {
    this.lastMouseDown = event;

    this.lastMouseDownX = this.targetSVGDocCoordinateSystem.fromClientX(event.clientX);
    this.lastMouseDownY = this.targetSVGDocCoordinateSystem.fromClientY(event.clientY);

    this.mouseIsDown = true;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.mouseIsDown) { return; }
    if (!this.lastMouseDown) { return; }

    // dragging must have been initiated on the target SVG document itself for the selecting rect to be drawn
    if (this.lastMouseDown.target !== this.targetSVGDoc) { return; }

    let mouseMoveX = this.targetSVGDocCoordinateSystem.fromClientX(event.clientX);
    let mouseMoveY = this.targetSVGDocCoordinateSystem.fromClientY(event.clientY);

    let d = `M ${this.lastMouseDownX} ${this.lastMouseDownY} H ${mouseMoveX} V ${mouseMoveY} H ${this.lastMouseDownX} z`;
    this.domNode.setAttribute('d', d);

    this.domNode.style.visibility = 'visible';
    this.isDrawn = true;
  }

  private handleMouseUp(event: MouseEvent): void {
    this.mouseIsDown = false;

    this.domNode.style.visibility = 'hidden';

    let wasDrawn = this.isDrawn;
    this.isDrawn = false;

    if (!wasDrawn) {
      // only select elements if the selecting rect was drawn
      return;
    }

    let mouseUpX = this.targetSVGDocCoordinateSystem.fromClientX(event.clientX);
    let mouseUpY = this.targetSVGDocCoordinateSystem.fromClientY(event.clientY);

    // the box covered by the selecting rect
    let coveredBox = Box.bounding([
      { x: this.lastMouseDownX, y: this.lastMouseDownY, width: 0, height: 0 },
      { x: mouseUpX, y: mouseUpY, width: 0, height: 0 },
    ]);

    // the elements covered by the selecting rect
    let coveredEles = [...this.targetSVGDoc.children].filter(isSVGGraphicsElements).filter(ele => (
      Box.matching(ele.getBBox()).isBoundedBy(coveredBox)
    ));

    !this.lastMouseDown?.shiftKey ? this.selectedSVGElements.clear() : {};
    this.selectedSVGElements.addAll(coveredEles);
  }
}
