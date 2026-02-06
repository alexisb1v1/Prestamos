export const GaugeChart = ({ value }: { value: number }) => {
    // Clamping value between 0 and 100 for visual representation
    const clampedValue = Math.min(Math.max(value, 0), 100);
    // Convert value to angle: 0% = -90deg, 100% = 90deg
    const angle = (clampedValue / 100) * 180 - 90;

    const radius = 35;
    const strokeWidth = 8;
    const center = 50;

    // Helper to calculate arc path
    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        const d = [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
        return d;
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    return (
        <div style={{ position: 'relative', width: '140px', height: '80px', margin: '0 auto' }}>
            <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
                {/* Red Zone: 0% to 80% (-90 to 54 deg) */}
                <path d={describeArc(center, 50, radius, -90, 54)} fill="none" stroke="#ef4444" strokeWidth={strokeWidth} />

                {/* Yellow Zone: 80% to 100% (54 to 90 deg) */}
                <path d={describeArc(center, 50, radius, 54, 88)} fill="none" stroke="#eab308" strokeWidth={strokeWidth} />

                {/* Green Zone: A small 'bonus' segment or just completing the arc if we treat 100 as the end. 
                    Let's adjust: The user said >= 100 is green. 
                    Visual representation: 0-80 (Red), 80-99 (Yellow), 100 (Green target).
                    Let's make the track full 180. 
                    0-80% of space = Red.
                    80-100% of space = Green? No, user logic: <80 Red, 80-99 Yellow, >=100 Green.
                    Let's simulate the Gauge zones:
                    Zone 1 (Low/Bad): 0-60% visually -> Red
                    Zone 2 (Medium/Warning): 60-90% visually -> Yellow
                    Zone 3 (High/Good): 90-100% visually -> Green
                    And we map the DATA value to this visual scale?
                    No, better to map true percentages.
                    0-80% (Red) -> large chunk.
                    80-100% (Yellow/Green transition).
                */}
                {/* Let's try explicit segments based on the logic requested */}
                {/* Red: 0-80% (-90 to 54) */}
                {/* Yellow: 80-99% (54 to 88.2) */}
                {/* Green Tip: 99-100% (88.2 to 90) - This is too small visually. 
                    Let's cheat the visual scales slightly for better aesthetic? 
                    Or stick to accurate?
                    Accurate:
                    -90 to 54 (144 degrees) is Red.
                    54 to 90 (36 degrees) is Yellow/Green?
                    Let's make the "Green" zone implied as reaching the end.
                */}
                <path d={describeArc(center, 50, radius, 88, 90)} fill="none" stroke="#22c55e" strokeWidth={strokeWidth} />

                {/* Needle */}
                <line
                    x1={center} y1={50}
                    x2={center} y2={20}
                    stroke="#1e293b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    transform={`rotate(${angle}, ${center}, 50)`}
                    style={{ transition: 'transform 1s ease-out' }}
                />
                <circle cx={center} cy={50} r="4" fill="#1e293b" />
            </svg>
            <div style={{
                position: 'absolute',
                bottom: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', lineHeight: 1 }}>{value}%</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>META</div>
            </div>
        </div>
    );
};
