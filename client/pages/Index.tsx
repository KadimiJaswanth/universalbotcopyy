import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Layout } from "@/components/layout";
import {
  MessageSquare,
  Volume2,
  Languages,
  HandIcon,
  Mic,
  Globe2,
  PlayCircle,
} from "lucide-react";

export default function Index() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Universal Bot
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Breaking Barriers in Communication
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Experience seamless communication across all languages with our
            advanced AI-powered chatbot. From text to speech, speech to text,
            and real-time translation - Universal Bot connects the world.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/chatbot">
              <Button size="lg" className="px-8 py-3 text-lg">
                Try Chatbot
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="secondary"
                className="px-8 py-3 text-lg"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the cutting-edge capabilities that make Universal Bot
              your perfect communication companion
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Text to Speech */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Volume2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Text ↔ Speech</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Convert text to natural-sounding speech and speech back to
                  text with high accuracy
                </CardDescription>
              </CardContent>
            </Card>

            {/* Speech to Text */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Speech ↔ Text</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Advanced speech recognition that understands context and
                  converts spoken words to precise text
                </CardDescription>
              </CardContent>
            </Card>

            {/* Translation */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Languages className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Translation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Powered by Google Translate API for instant, accurate
                  translation across 100+ languages
                </CardDescription>
              </CardContent>
            </Card>

            {/* Sign Language Recognition */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <HandIcon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Sign Language</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Revolutionary sign language recognition technology (coming
                  soon) for inclusive communication
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Try It Out</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Switch between modes to preview how Universal Bot works.
            </p>
          </div>
          <Tabs defaultValue="chat" className="max-w-4xl mx-auto">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Chat
              </TabsTrigger>
              <TabsTrigger
                value="translate"
                className="flex items-center gap-2"
              >
                <Globe2 className="h-4 w-4" /> Translate
              </TabsTrigger>
              <TabsTrigger value="tts" className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" /> Text-to-Speech
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              <Card>
                <CardHeader>
                  <CardTitle>Conversational AI</CardTitle>
                  <CardDescription>
                    Natural, contextual chat experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="rounded-md border px-3 py-2 bg-muted/40">
                      Hi! How can I help?
                    </div>
                    <div className="rounded-md border px-3 py-2">
                      Translate "Hello" to Spanish
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="translate">
              <Card>
                <CardHeader>
                  <CardTitle>Instant Translation</CardTitle>
                  <CardDescription>
                    Over 100 languages supported
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border p-3">
                      Hello, how are you?
                    </div>
                    <div className="rounded-md border p-3 bg-primary/10">
                      Hola, ¿cómo estás?
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tts">
              <Card>
                <CardHeader>
                  <CardTitle>Text to Speech</CardTitle>
                  <CardDescription>Listen to lifelike voices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2">
                      <Mic className="h-4 w-4" /> Record
                    </Button>
                    <Button className="gap-2">
                      <PlayCircle className="h-4 w-4" /> Play Sample
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find quick answers about features, pricing, and privacy.
            </p>
          </div>
          <Accordion type="single" collapsible className="max-w-3xl mx-auto">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                Is my data private and secure?
              </AccordionTrigger>
              <AccordionContent>
                Yes. We never sell your data and follow strict security
                practices. You control what is stored.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                Which languages are supported?
              </AccordionTrigger>
              <AccordionContent>
                We support 100+ languages for translation and voice. More are
                added continuously.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Can I use it on mobile?</AccordionTrigger>
              <AccordionContent>
                Absolutely. Universal Bot is responsive and works on all modern
                devices.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Break Communication Barriers?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join millions of users who trust Universal Bot for their
            communication needs. Start your journey towards seamless global
            communication today.
          </p>
          <Link to="/chatbot">
            <Button size="lg" className="px-8 py-3 text-lg">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
