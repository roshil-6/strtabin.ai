import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeExternalReports } from '../src/lib/projectAiPackage.ts';
import { tidyOcrText } from '../src/lib/reportScreenshots.ts';

const image = 'data:image/jpeg;base64,aGVsbG8=';
test('reports keep valid screenshots, may be image-only, and drop unsafe or oversized images', () => {
    const [report] = sanitizeExternalReports([{ id: 'r', title: 'Shots', content: '', provider: 'claude', createdAt: 1, updatedAt: 1, images: [image, 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,' + 'A'.repeat(700_000), ...Array(8).fill(image)] }]);
    assert.equal(report.images.length, 6);
    assert.ok(report.images.every(src => src === image));
    assert.deepEqual(sanitizeExternalReports([{ id: 'r', title: 't', content: '  ', provider: 'claude', images: ['bad'] }]), []);
    assert.equal('images' in sanitizeExternalReports([{ id: 'r', title: 't', content: 'Text', provider: 'stratabin' }])[0], false);
    assert.equal(sanitizeExternalReports([{ id: 'r', title: 't', content: 'Text', provider: 'stratabin' }])[0].provider, 'stratabin');
});

test('OCR text becomes tidy paragraphs and bullet lists', () => {
    assert.equal(tidyOcrText('Launch plan\n\n\n\nWe will ship the\nproduct in March.\n• Book venue\n● Hire staff\n1. First step'), 'Launch plan\n\nWe will ship the product in March.\n- Book venue\n- Hire staff\n1. First step');
});

test('misread bullet marks become one list', () => {
    assert.equal(tidyOcrText('Key risks\n\n+ Venue booking is not confirmed\n\n« Hiring two support staff\n\nNext step: confirm budget.'), 'Key risks\n\n- Venue booking is not confirmed\n- Hiring two support staff\n\nNext step: confirm budget.');
    assert.equal(tidyOcrText('Total 2 + 2 = 4'), 'Total 2 + 2 = 4');
});
