import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class SolarSystem extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            planet: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(4),

            // PLANET 1: icy-gray, 2 subdivisions, flat_shaded, diffuse only
            planet1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),

            // PLANET 2: swampy green-blue, 3 subdivisions, maximum specular, low diffuse
            planet2: new defs.Subdivision_Sphere(3),

            // PLANET 3: muddy brown-orange, 4 subdivisions, maximum diffuse and specular 
            planet3: new defs.Subdivision_Sphere(4),

            // PLANET 4: soft light blue, 4 subdivisions, smooth phong, high specular 
            planet4: new defs.Subdivision_Sphere(4),

            // MOON: 1 subdivision, flat shading, any material, small orbital distance around the planet
            moon: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),

            circle: new defs.Regular_2D_Polygon(1, 15),
        };

        // *** Materials
        this.materials = {
            // Requirement 4: Planet descriptions/materials
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .6, color: hex_color("#ffffff")}),

            // PLANET 1: icy-gray, flat-shaded, diffuse only
            planet1: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 1, specularity: 0, color: color(0.5,0.5,0.5,1)}),
            
            // PLANET 2: swampy green-blue, 3 subdivisions, maximum specular, low diffuse
            planet2_Phong: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: .3, specularity: 1, color: hex_color("#4a7938")}),
            planet2_Gouraud: new Material(new Gouraud_Shader(),
                {ambient: 0, diffusivity: .3, specularity: 1, color: hex_color("#4a7938")}),

            // PLANET 3: muddy brown-orange, 4 subdivisions, maximum diffuse and specular 
            planet3: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 1, specularity: 1, color: hex_color("#70543e")}),

            // PLANET 4: soft light blue, 4 subdivisions, smooth phong, high specular 
            planet4: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 1, specularity: 1, color: color(0.3,0.3,1,1)}),

            ring: new Material(new Ring_Shader()),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View solar system", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.new_line();
        this.key_triggered_button("Attach to planet 1", ["Control", "1"], () => this.attached = () => this.planet_1);
        this.key_triggered_button("Attach to planet 2", ["Control", "2"], () => this.attached = () => this.planet_2);
        this.new_line();
        this.key_triggered_button("Attach to planet 3", ["Control", "3"], () => this.attached = () => this.planet_3);
        this.key_triggered_button("Attach to planet 4", ["Control", "4"], () => this.attached = () => this.planet_4);
        this.new_line();
        this.key_triggered_button("Attach to moon", ["Control", "m"], () => this.attached = () => this.moon);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        
        // Sun radius and color changing
        const radius = Math.sin(t / 5 * 2 * Math.PI) + 2;
        const sun_color = color((radius - 1) / 2, 0, (3 - radius) / 2, 1); // change from red (1,0,0,1) to blue (0,0,0,1) over time

        // Lighting
        const light_position = vec4(0, 0, 0, 1); // move to center of the sun 
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 10**radius)]; // white color

        
        // 4 planets of radius 1 + SUN
        const angle = t; 
        const yellow = hex_color("#fac91a");
        let model_transform = Mat4.identity();

        // SUN
        let sun_transform = model_transform.times(Mat4.scale(radius, radius, radius))
        this.shapes.sphere.draw(context, program_state, sun_transform, this.materials.sun.override({color: sun_color}));
        
        // PLANET 1
        this.planet_1 = model_transform
            .times(Mat4.rotation(angle, 0, 1, 0))
            .times(Mat4.translation(5, 0, 0));
        this.shapes.planet1.draw(context, program_state, this.planet_1, this.materials.planet1);

        // PLANET 2
        this.planet_2 = model_transform
            .times(Mat4.rotation(angle / 2, 0, 1, 0))
            .times(Mat4.translation(8, 0, 0));
        let planet2_material = this.materials.planet2_Gouraud; // odd seconds 

        if (t % 2 < 1) // even seconds
            planet2_material = this.materials.planet2_Phong; 

        this.shapes.planet2.draw(context, program_state, this.planet_2, planet2_material);
        
        // PLANET 3
        this.planet_3 = model_transform
            .times(Mat4.rotation(angle / 3, 0, 1, 0))
            .times(Mat4.translation(11, 0, 0))
            .times(Mat4.rotation(Math.sin(t) / 2 + 1, 1, 0, 0));

        const ring = this.planet_3
            .times(Mat4.rotation(0.5, 1, 0, 0))
            .times(Mat4.scale(3.8, 3.8, 0.2));

        this.shapes.torus.draw(context, program_state, ring, this.materials.ring);
        this.shapes.planet3.draw(context, program_state, this.planet_3, this.materials.planet3);

        // PLANET 4
        this.planet_4 = model_transform
            .times(Mat4.rotation(angle / 4, 0, 1, 0))
            .times(Mat4.translation(14, 0, 0));
        this.moon = this.planet_4
            .times(Mat4.rotation(angle / 2, 0, 1, 0))
            .times(Mat4.translation(2, 0, 0));

        this.shapes.planet4.draw(context, program_state, this.planet_4, this.materials.planet4);
        this.shapes.moon.draw(context, program_state, this.moon, this.materials.planet4);
        
        // Requirement 5 + EC1: Camera buttons
        if (this.attached) {
            if (this.attached() == this.initial_camera_location) {
                program_state.set_camera(this.initial_camera_location);
            }
            else {
                const desired = this.attached().times(Mat4.translation(0, 0, 5));
                const blending_factor = 0.1;
                const current = desired.map((x,i) => Vector.from(program_state.camera_transform[i]).mix(x,blending_factor));
                program_state.set_camera(Mat4.inverse(current));
            }
            
        }
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec4 Vertex_color;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                vec3 N = normalize( mat3( model_transform ) * normal / squared_scale);
                vec3 vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                // Compute an initial (ambient) color:
                vec4 color = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                color.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                Vertex_color = color;
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                gl_FragColor = Vertex_color;
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // EC 2: Ring Shader
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
            // The vertex's final resting place (in NDCS):
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
            
            // calculating global point coordinates
            point_position = model_transform * vec4(position, 1.0);

            // calculate the planet origin
            center = model_transform * vec4(0.0, 0.0, 0.0, 1.0);
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // EC 2: Ring Shader
        return this.shared_glsl_code() + `
        void main(){
            // Compute an initial (ambient) color:
            float ambient = sin(18.0 * length(point_position.xyz - center.xyz));
            gl_FragColor = vec4(0.6, 0.4, 0.0, 1.0) * ambient;
          
        }`;
    }
}

