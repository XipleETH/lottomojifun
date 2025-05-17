/**
 * Endpoint para Farcaster Frames
 */
export default function handler(req, res) {
  // Verificar que sea un POST (requisito de Frames)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Responder con un frame de redirección a la app
  return res.status(200).json({
    version: "1",
    image: "https://amber-biological-pig-327.mypinata.cloud/ipfs/bafybeih623a6ybhlr3lxzjyknyjmqmgsixaktgblraw2vi2ispimgpfshm",
    title: "LottoMoji - Juega y Gana!",
    buttons: [
      {
        label: "Jugar Ahora",
        action: "post_redirect",
        target: "https://lottomojifun.vercel.app"
      }
    ],
    ogImage: "https://amber-biological-pig-327.mypinata.cloud/ipfs/bafybeih623a6ybhlr3lxzjyknyjmqmgsixaktgblraw2vi2ispimgpfshm"
  });
} 