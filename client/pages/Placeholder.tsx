import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
}

export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] py-12 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="text-center">
            <CardHeader className="py-12">
              <div className="mx-auto mb-6 w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Construction className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl md:text-3xl mb-4">
                {title}
              </CardTitle>
              <CardDescription className="text-lg">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-12">
              <p className="text-muted-foreground mb-6">
                This page is coming soon. Continue prompting to help fill in the
                content for this page!
              </p>
              <Link to="/">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// Specific placeholder pages
export function About() {
  return (
    <Placeholder
      title="About Universal Bot"
      description="Learn more about our mission to break communication barriers worldwide."
    />
  );
}

export function Contact() {
  return (
    <Placeholder
      title="Contact Us"
      description="Get in touch with our team for support or inquiries."
    />
  );
}

export function Privacy() {
  return (
    <Placeholder
      title="Privacy Policy"
      description="Your privacy and data security are our top priorities."
    />
  );
}
