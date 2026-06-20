import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PROMPT = `Analyze this medication or first-aid product packaging photo.
Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:
{
  "title": "product name and dosage/strength (e.g. Ibuprofen 400mg)",
  "category": "exactly one of: Pain Relief, Wound Care, Cold & Flu, Digestive, Allergy, Other",
  "conditions": "comma-separated symptoms or conditions this treats (e.g. headache, fever, pain)",
  "expirationDate": "expiry in YYYY-MM format if visible, otherwise empty string",
  "notes": "one-sentence product description"
}
If you cannot read the packaging clearly, make your best guess and leave expirationDate empty.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { image } = req.body
  if (!image || !image.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Missing or invalid image data' })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image, detail: 'low' } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
      max_tokens: 300,
    })

    let text = completion.choices[0].message.content.trim()
    // Strip markdown code fences if the model adds them despite instructions
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

    const data = JSON.parse(text)
    return res.status(200).json(data)
  } catch (err) {
    console.error('recognize error:', err)
    return res.status(500).json({ error: err.message ?? 'Recognition failed' })
  }
}
