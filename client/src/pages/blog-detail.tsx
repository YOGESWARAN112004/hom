import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImage: string | null;
  publishedAt: string | null;
  views: number;
  metaTitle: string | null;
  metaDescription: string | null;
}

export default function BlogDetailPage() {
  const [location, setLocation] = useLocation();
  const slug = location.split('/blog/')[1];

  const { data: blog, isLoading } = useQuery<Blog>({
    queryKey: [`/api/blogs/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-2xl mb-4">Blog Post Not Found</h1>
        <Button onClick={() => setLocation('/blog')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => setLocation('/blog')}
        className="mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
      </Button>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {blog.featuredImage && (
          <div className="aspect-video mb-8 overflow-hidden rounded-lg">
            <img
              src={blog.featuredImage}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            {blog.publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {blog.views || 0} views
            </div>
          </div>

          <h1 className="font-heading text-4xl md:text-5xl mb-4">{blog.title}</h1>
          {blog.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">{blog.excerpt}</p>
          )}
        </div>

        <Card className="bg-card border-white/5">
          <CardContent className="p-8">
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: blog.content }}
              style={{
                color: 'inherit',
              }}
            />
          </CardContent>
        </Card>
      </motion.article>
    </div>
  );
}

