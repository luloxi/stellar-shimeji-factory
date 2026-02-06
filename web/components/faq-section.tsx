"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollAnimation } from "./scroll-animation";
import { useLanguage } from "./language-provider";

const faqs = [
  {
    question: "What is a shimeji?",
    answer:
      "Shimeji are animated desktop companions that originated in Japan. They live on your screen, wander around, and — with this extension — can chat with you using AI.",
  },
  {
    question: "What is Standard mode?",
    answer:
      "Standard mode is text-only AI chat. You pick a personality (like Cozy, Chaotic, or Noir), add your own API key from OpenRouter or OpenAI, and your shimeji responds in character.",
  },
  {
    question: "What is AI Agent mode?",
    answer:
      "AI Agent mode connects your shimeji to an OpenClaw gateway. This gives it access to online searches, onchain tools, and other capabilities beyond simple text chat.",
  },
  {
    question: "Do I need an API key?",
    answer:
      "For Standard mode, yes — you provide your own OpenRouter or OpenAI key. For AI Agent mode, you need a running OpenClaw gateway instead.",
  },
  {
    question: "What are proactive messages?",
    answer:
      "When enabled, your shimeji will spontaneously comment on the page you're browsing — an observation, a joke, or a reflection based on its personality.",
  },
  {
    question: "Is the Chrome extension free?",
    answer:
      "Yes! The extension is free and includes a default mascot with full AI chat support. Custom shimejis can be commissioned through the Factory.",
  },
  {
    question: "Do I need a wallet?",
    answer:
      "Only if you want to commission a custom shimeji through the Factory. The AI chat features work without a wallet.",
  },
];

export function FAQSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <section id="faq" className="py-8 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              {isSpanish ? "Preguntas Frecuentes" : "Frequently Asked Questions"}
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-2xl px-6 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="text-md text-left text-foreground hover:no-underline py-5 font-semibold">
                  {isSpanish
                    ? index === 0
                      ? "¿Qué es un shimeji?"
                      : index === 1
                        ? "¿Qué es el modo Standard?"
                        : index === 2
                          ? "¿Qué es el modo AI Agent?"
                          : index === 3
                            ? "¿Necesito una API key?"
                            : index === 4
                              ? "¿Qué son los mensajes proactivos?"
                              : index === 5
                                ? "¿La extensión de Chrome es gratis?"
                                : "¿Necesito una wallet?"
                    : faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-md text-muted-foreground pb-5 leading-relaxed">
                  {isSpanish
                    ? index === 0
                      ? "Los shimeji son compañeros animados de escritorio que nacieron en Japón. Viven en tu pantalla, pasean, y — con esta extensión — pueden chatear contigo usando IA."
                      : index === 1
                        ? "El modo Standard es chat de texto con IA. Elegís una personalidad (como Cozy, Chaotic o Noir), agregás tu API key de OpenRouter u OpenAI, y tu shimeji responde acorde a su personaje."
                        : index === 2
                          ? "El modo AI Agent conecta tu shimeji a un gateway OpenClaw. Esto le da acceso a búsquedas online, herramientas onchain y otras capacidades más allá del chat de texto."
                          : index === 3
                            ? "Para el modo Standard, sí — usás tu propia key de OpenRouter u OpenAI. Para el modo AI Agent, necesitás un gateway OpenClaw corriendo en su lugar."
                            : index === 4
                              ? "Cuando están activados, tu shimeji comenta espontáneamente sobre la página que estás viendo — una observación, un chiste o una reflexión según su personalidad."
                              : index === 5
                                ? "¡Sí! La extensión es gratuita e incluye una mascota por defecto con soporte completo de chat IA. Los shimejis personalizados se encargan a través de Factory."
                                : "Solo si querés encargar un shimeji personalizado en Factory. Las funciones de chat IA funcionan sin wallet."
                    : faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollAnimation>
    </section>
  );
}
