import test from 'node:test';
import assert from 'node:assert/strict';
import {GARMENT_LABELS,interpretGarmentScores} from '../src/lib/garment-labels.js';
const scores = values => Object.entries(values).map(([type,score])=>({label:GARMENT_LABELS.Pants[type],score}));
test('photo decisions identify denim but abstain on ambiguous or low-confidence pants',()=>{
 assert.equal(interpretGarmentScores('Pants',scores({Jeans:.93,'Dress trousers':.02,Chinos:.05})).garmentType,'Jeans');
 assert.equal(interpretGarmentScores('Pants',scores({Jeans:.48,'Dress trousers':.45,Chinos:.07})).garmentType,'Unknown');
 assert.equal(interpretGarmentScores('Pants',scores({'Dress trousers':.8,Jeans:.1,Chinos:.1})).garmentType,'Unknown');
 assert.equal(interpretGarmentScores('Pants',scores({'Dress trousers':.95,Jeans:.04,Chinos:.01})).garmentType,'Unknown');
 assert.equal(interpretGarmentScores('Pants',scores({'Dress trousers':.96,Jeans:.01,Chinos:.03})).garmentType,'Dress trousers');
 assert.equal(interpretGarmentScores('Pants',[]).garmentType,'Unknown');
});
