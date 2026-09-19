Drop your profile photo here as `profile.jpg`, then update the About
section in `index.html` to use it instead of the placeholder box:

```html
<div class="about-image">
  <img src="assets/images/profile.jpg" alt="Nick Williams" style="width:100%; height:100%; object-fit:cover; border-radius: inherit;">
</div>
```

Blog post cover images are optional. To add one to a post, set an
`image:` field in that post's front matter (path relative to the project
root, e.g. `assets/images/blog/my-post-cover.jpg`) and rebuild.
