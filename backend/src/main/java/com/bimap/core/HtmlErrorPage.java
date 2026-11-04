package com.bimap.core;

import module java.base;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.Nullable;
import org.springframework.boot.webmvc.autoconfigure.error.ErrorViewResolver;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.View;
import org.springframework.web.util.HtmlUtils;

@Controller
public class HtmlErrorPage implements ErrorViewResolver, View {

    private final String html;
    private final MediaTypeRequestMatcher matcher = new MediaTypeRequestMatcher(MediaType.TEXT_HTML);

    public HtmlErrorPage() throws IOException {
        html = new ClassPathResource("static/error.html").getContentAsString(StandardCharsets.UTF_8);
        matcher.setIgnoredMediaTypes(Set.of(MediaType.ALL));
    }

    public boolean acceptsHtml(HttpServletRequest request) {
        return matcher.matches(request);
    }

    public void write(HttpServletRequest request, HttpServletResponse response, int status) throws IOException {
        response.setStatus(status);
        response.setContentType("text/html;charset=UTF-8");
        var base = HtmlUtils.htmlEscape(request.getContextPath() + "/");
        response.getWriter().write(html.replace("__BASE_PATH__", base));
    }

    @GetMapping(value = "/error.html", produces = MediaType.TEXT_HTML_VALUE)
    void show(HttpServletRequest request, HttpServletResponse response) throws IOException {
        write(request, response, HttpStatus.NOT_FOUND.value());
    }

    @Override
    public ModelAndView resolveErrorView(HttpServletRequest request, HttpStatus status, Map<String, Object> model) {
        var view = new ModelAndView(this);
        view.setStatus(status);
        return view;
    }

    @Override
    public String getContentType() {
        return MediaType.TEXT_HTML_VALUE;
    }

    @Override
    public void render(@Nullable Map<String, ?> model, HttpServletRequest request, HttpServletResponse response) throws IOException {
        write(request, response, response.getStatus());
    }
}
