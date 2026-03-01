import React, { useState, useEffect } from 'react';
import { renderToString } from 'react-dom/server';

function TestComponent() {
    const mode = 'edit';
    const initialData = { strategy: 'Vert', status: 'CLOSED', closePrice: 0.0, notes: "Vertical Spread - Leg 1: $50 (.95), Leg 2: $49 (.77)\nClosed - Leg 1: $.17, Leg 2: $.12" };
    const [formData, setFormData] = useState(initialData);
    const [vertCloseData, setVertCloseData] = useState({ leg1ClosePrice: '', leg2ClosePrice: '' });

    useEffect(() => {
        const closeMatch = initialData.notes.match(/Closed - Leg 1: \$([\d.]+), Leg 2: \$([\d.]+)/);
        if (closeMatch) {
            setVertCloseData({ leg1ClosePrice: closeMatch[1], leg2ClosePrice: closeMatch[2] });
        }
    }, []);

    useEffect(() => {
        if (formData.strategy === 'Vert' && (mode === 'close' || (mode === 'edit' && formData.status === 'CLOSED'))) {
            const p1 = Number(vertCloseData.leg1ClosePrice) || 0;
            const p2 = Number(vertCloseData.leg2ClosePrice) || 0;
            const netClose = p2 - p1;
            console.log("Calculated netClose:", netClose);
            setFormData(prev => {
                if (prev.closePrice !== netClose) return { ...prev, closePrice: netClose };
                return prev;
            });
        }
    }, [vertCloseData.leg1ClosePrice, vertCloseData.leg2ClosePrice, formData.strategy, mode, formData.status]);

    return <div>{(formData.closePrice || 0).toFixed(2)}</div>;
}
console.log(renderToString(<TestComponent />));
