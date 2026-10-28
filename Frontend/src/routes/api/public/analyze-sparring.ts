import { createFileRoute } from '@tanstack/react-router';
import { analyzeSparring } from '@/lib/ai/sparring.server';
export const Route=createFileRoute('/api/public/analyze-sparring')({server:{handlers:{POST:({request})=>analyzeSparring(request)}}});