import Util from "/scripts/Util.js";
import Vector from "/scripts/Vector.js";

export default class Arc {
    center = new Vector(0, 0);
    radius = 1;
    startAngle = Util.rad(0);
    endAngle = Util.rad(360);

    /**
     * Whether the arc contains the points between the given angles, or those 
     * NOT between. If true, a point is on the arc if it satisfies the condition:
     * startAngle <= angle(point) <= endAngle. If false, it must satisfy such:
     * angle(point) <= startAngle || angle(point) >= endAngle.
     * 
     * For simplicity, if this is true, the arc goes counter clockwise from the 
     * startAngle to the end angle. If this is false, it goes clockwise from the
     * start angle to the end angle.
     */
    isBetween = true;

    constructor(radius = 1, {
        center = this.center, 
        startAngle = this.startAngle, 
        endAngle = this.endAngle,
        isBetween = this.isBetween,
    } = {}) {
        this.radius = radius;
        this.center = center;
        this.startAngle = Math.min(startAngle, endAngle);
        this.endAngle = Math.max(startAngle, endAngle);
        this.isBetween = isBetween;
    }

    getX() {
        return this.center.getX();
    }
    
    getY() {
        return this.center.getY();
    }

    getR() {
        return this.radius;
    }

    getNormStartAngle() {
        return Util.normAngle(this.startAngle);
    }
    
    getNormEndAngle() {
        return Util.normAngle(this.endAngle);
    }

    /**
     * Calculates the intersections between this circle and another. The return 
     * is an array with the two intersection points; two elements if the circles 
     * intersect, two identical elements if the circles are tangent, and zero 
     * elements if the circles do not intersect.
     * 
     * The start and end angles of each arc are not respected; each arc is 
     * considered a full circle.
     * 
     * @param {Arc} other  - The circle to compare against.
     * @returns {Vector[]} An array containing the intersection points. 
     */
    intersectFull(other) {
        // A - circle.center; B - this.center
        const delta = this.center.subtract(other.center);
        const lSqr = delta.sqrNorm();
        const t = 0.5 * (lSqr + this.getR() * this.getR() - other.getR() * other.getR()) / lSqr;
        const perpOffset = new Vector(-delta.y, delta.x).scale(Math.sqrt(
            this.getR() * this.getR() / lSqr 
            - t * t/*  * Math.sqrt(lSqr) */
        ));

        if(isNaN(perpOffset.x) && isNaN(perpOffset.y)) {
            // The radical's argument was negative; there is no intersection
            return [];
        }
        
        const p = this.center.subtract(delta.scale(t));
        return [p.add(perpOffset), p.subtract(perpOffset)];
    }

    /**
     * Gets the length of this arc, in radians. To convert to a distance unit,
     * multiply by the radius
     * 
     * @returns {number} The length of this arc, in radians
     */
    getArcLength() {
        if(this.isBetween) {
            return this.endAngle - this.startAngle;
        } else {
            return Util.TAU - (this.endAngle - this.startAngle);
        }
    }

    /**
     * Returns a new arc with normalized start and end angles. The returned arc
     * contains the same set of points as the unnormalized arc. The radius and 
     * center properties are guaranteed to be identical, but the angles and the
     * isBetween properties are not.
     * 
     * @returns {Arc} An arc whose start and end angles lie in the interval 
     *     [-pi, +pi).
     */
    normalize() {
        // If this comprises a full circle, immediately return a full circle
        if(this.getArcLength() >= Util.TAU) {
            return new Arc(this.radius, {
                center: this.center,
                startAngle: -Math.PI,
                endAngle: -Math.PI,
                isBetween: false
            });
        }

        // Getting the normalized angles and 'tween-ness if this isn't a full circle
        const startNorm = this.getNormStartAngle();
        const endNorm = this.getNormEndAngle();

        // Getting whether the new arc needs to be between the angles or outside
        // This is done by getting a certain angle and checking whether it lies 
        // on the unnormalized arc; if it doesn't, change the betweenness to 
        // reflect the same relation. 
        const mean = (this.startAngle + this.endAngle) * 0.5; 
        const meanBetweenNorm = mean >= startNorm && mean <= endNorm;
        const newIsBetween = !(this.isBetween ^ meanBetweenNorm);

        // Constructing and returning the new arc
        return new Arc(this.radius, {
            center: this.center,
            startAngle: startNorm, 
            endAngle: endNorm,
            isBetween: newIsBetween
        });
    }

    /**
     * Checks whether the given angle is included in the arc.
     * 
     * NOTE: If the arc's start and end angles are not normalized or the given 
     * theta is not normalized, the result may be unexpected. 
     * 
     * @param {number} theta Angle to check against, in radians
     * @returns {boolean} Whether the angle is included in the arc 
     */
    contains(theta) {
        return (theta >= this.startAngle && theta <= this.endAngle) === this.isBetween;
    }

    /**
     * Returns whether a point is contained in the sector represented by this 
     * arc. The arc is normalized beforehand. 
     * 
     * No state is mutated by this method
     * 
     * @param {Vector} vector - The point to check against
     * @returns {boolean} Whether the angle of the point relative to this's 
     *     center is contained in the arc.
     */
    sectorContains(vector) {
        return this.normalize().contains(vector.subtract(this.center).arctan());
    }

    /**
     * Calculates the intersections between this arc and another. The return 
     * is an array with the two intersection points; two elements if the arcs 
     * intersect, two identical elements if the arcs are tangent, and zero 
     * elements if the arcs do not intersect.
     * 
     * @param {Arc} other  - The arc to compare against.
     * @returns {Vector[]} An array containing the intersection points. 
     */
    intersect(other) {
        const fullIntersections = this.intersectFull(other);
        // console.log(fullIntersections);
        return fullIntersections.filter(v => {
            // console.log(`${v} -> ${Util.deg(v.subtract(this.center).arctan())}`);
            // console.log(`${v} -> ${Util.deg(v.subtract(other.center).arctan())}`);
            return this.sectorContains(v) && other.sectorContains(v)
        });
    }

    /**
     * Calculates the intersections between this circle and a line. The return 
     * is an array with the two intersection points; two elements if the figures 
     * intersect, two identical elements if the figures are tangent, and zero 
     * elements if the figures do not intersect.
     * 
     * The start and end angles of this arc are not respected; this arc is 
     * considered a full circle.
     * 
     * @param {number} a - Negative of the numerator of the line's slope
     * @param {number} b - Denominator of the line's slope
     * @param {number} c - Right-hand side of the standard form line equation
     * @return {Vector[]} The intersection points between this circle and the 
     *     given line
     */
    intersectLineFull(a, b, c) {
        // Finding the intersection between the line and the circle translated 
        // so the circle's center is at the origin 
        const cPrime = c - a * (this.center.x) - b * (this.center.y); // Translated c
        const sqrSum = a * a + b * b;
        const discriminant = this.radius * this.radius * sqrSum - cPrime * cPrime;

        if(discriminant < 0 || sqrSum == 0) {
            return [];
        }

        const xRadical = Math.sqrt(b * b * discriminant) / sqrSum;
        const yRadical = a * Math.sqrt(discriminant) / sqrSum;

        // --- PLUS ---
        // x = (sqrt(b^2 (r^2 (a^2 + b^2) - c^2)) + a c)/(a^2 + b^2) 
        // y = (b c - a sqrt(r^2 (a^2 + b^2) - c^2))/(a^2 + b^2)

        // --- MINUS ---
        // x = (a c - sqrt(b^2 (r^2 (a^2 + b^2) - c^2)))/(a^2 + b^2) 
        // y = (a sqrt((r^2 (a^2 + b^2) - c^2)) + b c)/(a^2 + b^2)
        const xAddend = a * cPrime / sqrSum;
        const yAddend = b * cPrime / sqrSum;

        // Getting both plus and minus, and translating back
        return [
            new Vector(xAddend + xRadical, yAddend - yRadical).add(this.center),
            new Vector(xAddend - xRadical, yAddend + yRadical).add(this.center)
        ];
    }
}